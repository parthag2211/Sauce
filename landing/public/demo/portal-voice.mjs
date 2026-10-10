// Live recordings remain in memory until the authenticated upload completes.
export async function captureVoice(complete,failed){
  if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw new Error('Use a browser with microphone support on HTTPS.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
  let recorder;
  try{recorder=new MediaRecorder(stream,mimeType?{mimeType}:{});}catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}
  const chunks=[];let timer,error=false,size=0;
  const release=()=>{clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());};
  recorder.ondataavailable=e=>{size+=e.data.size;chunks.push(e.data);if(size>20*1024*1024&&recorder.state!=='inactive')recorder.stop();};
  recorder.onerror=()=>{error=true;release();failed(new Error('Recording stopped unexpectedly. Try again.'));};
  recorder.onstop=()=>{release();if(error)return;if(size>20*1024*1024){failed(new Error('Keep your recording under 20 MB.'));return;}complete(new Blob(chunks,{type:recorder.mimeType}));};
  try{recorder.start(250);}catch(e){release();throw e;}
  timer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},120000);
  return {stop(){if(recorder.state!=='inactive')recorder.stop();}};
}
