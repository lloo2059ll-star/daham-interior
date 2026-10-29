// Run after adding a case and its publishedAt to portfolio-static-domain.js.
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const projects=require('../portfolio-static-domain.js').listProjects();
const files=[...fs.readdirSync(root).filter(x=>x.endsWith('.html')).map(x=>path.join(root,x)),...fs.readdirSync(path.join(root,'portfolio')).filter(x=>x.endsWith('.html')).map(x=>path.join(root,'portfolio',x))];
for(const file of files){
 let html=fs.readFileSync(file,'utf8');if(!html.includes('id="dh-owl"'))continue;
 const grid=html.match(/<div class="do-grid">([\s\S]*?)<\/div>/);if(!grid)continue;
 const cards=new Map([...grid[1].matchAll(/<a\b[^>]*data-project="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)].map(m=>[m[1],m[0]]));
 const prefix=path.dirname(file)===root?'':'../';
 const ordered=projects.map(project=>cards.get(project.slug)||`<a class="do-project cursor-interaction" data-project="${project.slug}" href="${prefix}portfolio/${project.slug}.html"><img alt="${project.title}" loading="lazy" src="${prefix}${project.thumbnailImage}"/><span>${project.title}</span></a>`).join('');
 for(const project of projects)cards.delete(project.slug);
 if(cards.size)throw new Error('Unregistered portfolio cards in '+file);
 html=html.replace(grid[0],'<div class="do-grid">'+ordered+'</div>');fs.writeFileSync(file,html);
}
