// This boundary is a completed renderer.render call, not physical display presentation.
export function createFrameLedger({capacity=240,timeOrigin=null}={}){
  if(!Number.isInteger(capacity)||capacity<1||capacity>1000)throw new TypeError('Invalid frame capacity');
  const sessionId=globalThis.crypto.randomUUID();
  let sequence=0,evicted=0,previous=null;
  const frames=[];
  return {
    record({startedAt,submittedAt,recordedAt,modelTime,captureId,poses,camera,phase}){
      if(!Number.isFinite(startedAt)||!Number.isFinite(submittedAt)||submittedAt<startedAt||(previous!==null&&startedAt<previous))throw new TypeError('Invalid submission interval');
      const frame={frameId:++sequence,startedAt,submittedAt,recordedAt,modelTime,captureId,phase,
        intervalBefore:previous===null?null:{from:previous,to:startedAt,durationMs:startedAt-previous,state:'NO_RENDER_SUBMISSION_OBSERVED',intermediateStates:'UNOBSERVED'},
        poses:structuredClone(poses),camera:structuredClone(camera)};
      previous=submittedAt;frames.push(frame);if(frames.length>capacity){frames.shift();evicted++;}
      return {frameId:sequence,retained:frames.length,evicted};
    },
    export(){return {schema:'HALVETH_RENDER_SUBMISSIONS_V1',sessionId,observer:'INLINE_AFTER_RENDERER_RENDER',scope:'MODEL_POSES_AND_RENDER_SUBMISSIONS',clock:{monotonic:'performance.now',timeOrigin,wallClock:'Date.toISOString',precision:'UNKNOWN',calibration:'UNKNOWN'},coverage:{trigger:'EVERY_CHAIN_RENDER_SUBMISSION',retentionCapacity:capacity,totalRecorded:sequence,evicted,physicalPresentation:'UNOBSERVED',betweenSubmissions:'UNOBSERVED',observerEffect:'INLINE_COPY_AND_TIMESTAMPS'},frames:structuredClone(frames)};}
  };
}
