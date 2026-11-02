"""Compile a small CC0 character pilot from the three supplied Quaternius archives.

No archive is extracted wholesale. Model-local resources are read from exact ZIP
members and embedded in GLB containers. Image bytes remain unchanged. A derived
head mesh retains triangles above a declared height cutoff; outfits cover the body.
"""
from pathlib import Path, PurePosixPath
import argparse, copy, hashlib, json, posixpath, struct, zipfile

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'entities/research/characters'
PACKS=['Universal Base Characters[Standard].zip','Modular Character Outfits - Fantasy[Standard].zip','Universal Animation Library[Standard].zip']
sha=lambda b:hashlib.sha256(b).hexdigest()

def resource(z,member,uri,repairs=None):
    if not isinstance(uri,str) or ':' in uri or '\\' in uri:raise ValueError('External or malformed resource URI')
    p=posixpath.normpath(posixpath.join(posixpath.dirname(member),uri))
    if p.startswith('../') or p.split('/')[0]!=member.split('/')[0]:raise ValueError('Resource outside its source pack')
    # These two exact missing references were inspected in the supplied base
    # pack. This is an explicit repair map, not a general filename fallback.
    repair_map={'T_Eye_Normal_png.png':'T_Eye_Normal.png',
                'T_Hair_1_Normal_png.png':'T_Hair_1_Normal.png'}
    if p not in z.namelist() and PurePosixPath(p).name in repair_map:
        corrected=posixpath.join(posixpath.dirname(p),repair_map[PurePosixPath(p).name])
        if corrected in z.namelist() and repairs is not None:
            repairs.append({'declaredURI':uri,'usedMember':corrected,'operation':'EXPLICIT_INSPECTED_MISSING_NORMAL_URI_REPAIR','resourceSha256':sha(z.read(corrected))})
            p=corrected
    info=z.getinfo(p)
    if info.file_size>40_000_000:raise ValueError('Resource size limit')
    return z.read(info)

def accessor(d,b,index):
    a=d['accessors'][index];v=d['bufferViews'][a['bufferView']]
    if a.get('sparse'):raise ValueError('Sparse accessor unsupported by this compiler')
    fmt={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
    width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    size=struct.calcsize('<'+fmt*width);stride=v.get('byteStride',size)
    start=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*width,b,start+i*stride) for i in range(a['count'])]

def align(b):
    b.extend(b'\0'*((-len(b))%4))

def compile_gltf(z,member,head=False):
    d=json.loads(z.read(member));d=copy.deepcopy(d)
    if len(d.get('buffers',[]))!=1:raise ValueError('Exactly one source buffer required')
    repairs=[]
    source=resource(z,member,d['buffers'][0]['uri'],repairs);b=bytearray(source)
    transformation={'kind':'EMBED_RESOURCES_UNCHANGED'}
    if head:
        details=[]
        for mesh in d['meshes']:
            if not mesh.get('name','').startswith('Superhero_'):continue
            for p in mesh['primitives']:
                positions=accessor(d,source,p['attributes']['POSITION'])
                cutoff=max(v[1] for v in positions)-.27
                old=[v[0] for v in accessor(d,source,p['indices'])]
                kept=[]
                for i in range(0,len(old),3):
                    tri=old[i:i+3]
                    if len(tri)==3 and all(positions[j][1]>=cutoff and abs(positions[j][0])<=.19 for j in tri):kept.extend(tri)
                if not kept:raise ValueError('Head derivation produced no triangles')
                align(b);offset=len(b);b.extend(struct.pack('<'+'I'*len(kept),*kept))
                bv=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(kept)*4,'target':34963})
                ai=len(d['accessors']);d['accessors'].append({'bufferView':bv,'componentType':5125,'count':len(kept),'type':'SCALAR','min':[min(kept)],'max':[max(kept)]});p['indices']=ai
                details.append({'mesh':mesh['name'],'cutoffYMetres':cutoff,'originalTriangles':len(old)//3,'retainedTriangles':len(kept)//3})
        transformation={'kind':'DERIVED_HEAD_BY_DECLARED_POSITION_FILTER','details':details,'imageBytes':'UNCHANGED','originalArchive':'RETAINED_BY_USER'}
    # A browser pilot needs the colour textures; high-resolution normal/ORM
    # maps add nearly 90 MB. Omit those channels explicitly without re-encoding
    # any image. The full source materials remain in the user's archives.
    removed=[];used=set()
    for material in d.get('materials',[]):
        for field in ['normalTexture','occlusionTexture']:
            if field in material:removed.append({'material':material.get('name'),'field':field});del material[field]
        pbr=material.get('pbrMetallicRoughness',{})
        if 'metallicRoughnessTexture' in pbr:
            removed.append({'material':material.get('name'),'field':'pbrMetallicRoughness.metallicRoughnessTexture'})
            del pbr['metallicRoughnessTexture'];pbr.setdefault('metallicFactor',0);pbr.setdefault('roughnessFactor',.85)
        for obj,key in [(pbr,'baseColorTexture'),(material,'emissiveTexture')]:
            if key in obj:used.add(obj[key]['index'])
    texture_map={old:new for new,old in enumerate(sorted(used))}
    textures=[d['textures'][i] for i in sorted(used)]
    image_ids=sorted({t['source'] for t in textures});image_map={old:new for new,old in enumerate(image_ids)}
    for t in textures:t['source']=image_map[t['source']]
    for material in d.get('materials',[]):
        for obj,key in [(material.get('pbrMetallicRoughness',{}),'baseColorTexture'),(material,'emissiveTexture')]:
            if key in obj:obj[key]['index']=texture_map[obj[key]['index']]
    d['textures']=textures;d['images']=[d['images'][i] for i in image_ids]
    transformation['materialPreview']={'kind':'BASE_COLOUR_WITHOUT_NORMAL_OR_ORM','omittedChannels':removed,'retainedImageEncoding':'EXACT_SOURCE_BYTES'}
    for image in d.get('images',[]):
        uri=image.pop('uri',None)
        if uri is None:continue
        blob=resource(z,member,uri,repairs);align(b);offset=len(b);b.extend(blob)
        image['bufferView']=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)})
        image.setdefault('mimeType','image/png')
    d['buffers']=[{'byteLength':len(b)}]
    d.setdefault('asset',{})['generator']='HALVETH CC0 character pilot compiler 1.0; '+d.get('asset',{}).get('generator','')
    raw=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode('utf-8');raw+=b' '*((-len(raw))%4);align(b)
    result=struct.pack('<III',0x46546c67,2,12+8+len(raw)+8+len(b))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(b),0x004e4942)+bytes(b)
    transformation['resourceRepairs']=repairs
    return result,transformation,d

def joint_contract(d):
    joints={i for s in d.get('skins',[]) for i in s['joints']}
    return {d['nodes'][i].get('name'):sorted(d['nodes'][c].get('name') for c in d['nodes'][i].get('children',[]) if c in joints) for i in joints}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('source_directory',type=Path);args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    archives=[zipfile.ZipFile(args.source_directory/p) for p in PACKS]
    try:
        archive_records=[]
        for name,z in zip(PACKS,archives):
            for i in z.infolist():
                p=PurePosixPath(i.filename)
                if p.is_absolute() or '..' in p.parts or '\\' in i.filename:raise ValueError('Unsafe archive member')
            licence=next(n for n in z.namelist() if PurePosixPath(n).name.lower() in ('license_standard.txt','license.txt'))
            text=z.read(licence)
            if b'CC0 1.0' not in text:raise ValueError('CC0 licence text missing')
            archive_records.append({'file':name,'sha256':sha((args.source_directory/name).read_bytes()),'licenseMember':licence,'licenseSha256':sha(text),'license':'CC0-1.0'})
        variants=[];files=[];contracts={}
        for sex,outfit in [('Female','Ranger'),('Male','Peasant')]:
            head_member=next(n for n in archives[0].namelist() if n.endswith('/Godot - UE/Superhero_'+sex+'_FullBody.gltf'))
            outfit_member=next(n for n in archives[1].namelist() if n.endswith('/Outfits/'+sex+'_'+outfit+'.gltf'))
            assets=[]
            for source_index,member,derived_head,label in [(0,head_member,True,'head'),(1,outfit_member,False,'outfit')]:
                blob,transformation,d=compile_gltf(archives[source_index],member,derived_head)
                filename=sex.lower()+'-'+label+'.glb';(OUT/filename).write_bytes(blob)
                files.append({'path':filename,'bytes':len(blob),'sha256':sha(blob),'sourceArchive':PACKS[source_index],'sourceMember':member,'transformation':transformation})
                assets.append(filename);contracts[filename]=joint_contract(d)
            # Verify name and parent topology across the two separately skinned parts.
            if contracts[assets[0]]!=contracts[assets[1]]:raise ValueError('Head/outfit skeleton topology mismatch')
            variants.append({'id':sex.lower(),'label':'Waldläuferin' if sex=='Female' else 'Reisender','parts':assets,'skeletonJointCount':len(contracts[assets[0]])})
        animation_member=next(n for n in archives[2].namelist() if n.endswith('/Unreal-Godot/UAL1_Standard.glb'))
        blob=archives[2].read(animation_member);(OUT/'animations.glb').write_bytes(blob)
        length,kind=struct.unpack_from('<II',blob,12);d=json.loads(blob[20:20+length])
        animation_contract=joint_contract(d)
        for c in contracts.values():
            if c!=animation_contract:raise ValueError('Animation/model skeleton topology mismatch')
        files.append({'path':'animations.glb','bytes':len(blob),'sha256':sha(blob),'sourceArchive':PACKS[2],'sourceMember':animation_member,'transformation':{'kind':'EXACT_BYTES_NON_ROOT_MOTION_VARIANT'}})
        result={'schema':'halveth.character-pilot.v1','author':'Quaternius','source':'https://quaternius.com','license':'CC0-1.0','variants':variants,'animationNames':[a['name'] for a in d.get('animations',[])],'animationSource':'animations.glb','retargetContract':'Same joint-name and parent topology checked; target rest pose is preserved by the runtime adapter. Visual fit requires browser inspection.','archives':archive_records,'files':files}
        (OUT/'manifest.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
        (OUT/'LICENSE-CC0.txt').write_bytes(archives[2].read(archive_records[2]['licenseMember']))
        print(json.dumps({'variants':len(variants),'animations':len(result['animationNames']),'outputBytes':sum(x['bytes'] for x in files),'files':[(x['path'],x['bytes']) for x in files]}))
    finally:
        for z in archives:z.close()

if __name__=='__main__':main()
