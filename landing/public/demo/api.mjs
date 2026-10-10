// The mock HTTP namespace is deliberate. Replace this adapter with authenticated
// production routes without changing the four domain objects or screen components.
export async function demoRequest(operation, body) {
  const response = await fetch(`/api/demo/${operation}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'The demo request failed. Try again.');
  return result;
}
export async function liveRequest(path,body,method){
  const response=await fetch(`/api/v1${path}`,{method:method||(body===undefined?'GET':'POST'),credentials:'same-origin',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.message||'Sauce could not save this. Try again.'),{status:response.status});return result;
}
export async function uploadRecording(blob,id){
  const response=await fetch('/api/v1/voice',{method:'POST',credentials:'same-origin',headers:{'Content-Type':blob.type||'audio/webm','Idempotency-Key':id},body:blob});
  const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.message||'Your recording could not upload. Keep this page open and try again.'),{status:response.status});return result;
}
