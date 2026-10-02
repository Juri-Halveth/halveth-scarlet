// Keep the static directory available even when the 3D module cannot load.
import('./entity-world.mjs').catch(error => {
  document.getElementById('world-loading').hidden = true;
  document.getElementById('world-error').hidden = false;
  document.getElementById('profile-directory').hidden = false;
  document.getElementById('world-retry').onclick = () => location.reload();
  document.getElementById('world-fallback').onclick = () => document.getElementById('profile-directory').scrollIntoView();
  console.warn('Character world module unavailable:', error.message);
});
