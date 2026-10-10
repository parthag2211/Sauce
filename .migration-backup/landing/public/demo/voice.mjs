const database = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('sauce-demo-audio', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('recordings');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Private audio storage is unavailable in this browser.'));
});
async function withStore(mode, operation) {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('recordings', mode);
    const request = operation(tx.objectStore('recordings'));
    let value;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(new Error('Could not save the recording on this device.'));
    tx.onabort = tx.onerror;
  }); } finally { db.close(); }
}
export async function saveAudio(blob) {
  if (!blob.size || blob.size > 20 * 1024 * 1024) throw new Error('Use a recording under 20 MB.');
  const blobId = crypto.randomUUID();
  await withStore('readwrite', store => store.put(blob, blobId));
  return { blobId, mimeType: blob.type || 'audio/unknown', bytes: blob.size, capturedAt: new Date().toISOString() };
}
export const readAudio = id => withStore('readonly', store => store.get(id));
export const clearAudio = () => withStore('readwrite', store => store.clear());
export async function startRecording(onComplete, onFailure) {
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) throw new Error('Recording needs a supported browser on HTTPS. Try a sample answer instead.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t));
  let recorder;
  try { recorder = new MediaRecorder(stream, type ? { mimeType: type } : {}); }
  catch (error) { stream.getTracks().forEach(t => t.stop()); throw error; }
  const chunks = [];
  const started = Date.now();
  const release = () => stream.getTracks().forEach(t => t.stop());
  let failed = false;
  let timer;
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onerror = () => { failed = true; clearTimeout(timer); release(); onFailure(new Error('Recording failed. Please try again.')); };
  recorder.onstop = async () => {
    clearTimeout(timer); release();
    if (failed) return;
    try { const audio = await saveAudio(new Blob(chunks, { type: recorder.mimeType })); onComplete({ ...audio, durationMs: Date.now() - started }); }
    catch (error) { onFailure(error); }
  };
  try { recorder.start(250); } catch (error) { release(); throw error; }
  const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
  timer = setTimeout(stop, 120000);
  return { stop };
}
