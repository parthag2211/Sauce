// Curated, job-related summaries of public CVs. These researchers are not applicants.
// CV snapshots were reviewed on 2026-10-10. Cheng's linked CV is dated February 2024.
export const SAMPLES = [
  { id:'cheng', name:'Cheng Chi', cvUrl:'https://cheng-chi.github.io/assets/files/cv.pdf', cvDate:'February 2024',
    summary:'Research in robotic manipulation and perception. The public CV lists work on diffusion policies, manipulation interfaces, and real-time robot control.',
    publications:[{id:'2303.04137',label:'Diffusion Policy'}],
    supportedClaim:'Coauthor of the Diffusion Policy paper.',
    uncertainClaim:'Personally owned the physical robot deployment and its production maintenance.',
    uncertainOrigin:'Demo verification question. This is not a statement made by the researcher.' },
  { id:'yilun', name:'Yilun Du', cvUrl:'https://yilundu.github.io/cv.pdf', cvDate:'Public CV reviewed October 2026',
    summary:'Research in generative models, compositional learning, world models, and robot learning. The public CV lists the Diffusion Policy publication.',
    publications:[{id:'2303.04137',label:'Diffusion Policy'},{id:'2205.09991',label:'Diffusion planning'}],
    supportedClaim:'Coauthor of the Diffusion Policy paper.',
    uncertainClaim:'Personally owned the physical robot deployment and its production maintenance.',
    uncertainOrigin:'Demo verification question. This is not a statement made by the researcher.' },
  { id:'chelsea', name:'Chelsea Finn', cvUrl:'https://ai.stanford.edu/~cbfinn/_files/cv.pdf', cvDate:'Public CV reviewed October 2026',
    summary:'Research in robot learning, imitation learning, and adaptation. The public CV lists work on bimanual manipulation with low-cost hardware.',
    publications:[{id:'2304.13705',label:'Bimanual manipulation'}],
    supportedClaim:'Coauthor of the low-cost bimanual manipulation paper.',
    uncertainClaim:'Personally owned the physical robot deployment and its production maintenance.',
    uncertainOrigin:'Demo verification question. This is not a statement made by the researcher.' }
];

export const CRITERIA = [
  {id:'diffusion',name:'Robot action diffusion',text:'Publication evidence of an action diffusion policy for robot control, with physical robot evaluation. Coauthorship is sufficient.'},
  {id:'bimanual',name:'Bimanual imitation learning',text:'Publication evidence of imitation learning for physical bimanual robot manipulation. Coauthorship is sufficient.'},
  {id:'ownership',name:'Personal deployment ownership',text:'Explicit evidence that the individual personally owned physical robot deployment and production maintenance. Paper authorship alone is insufficient.'}
];
