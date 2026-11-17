require('dotenv').config();
const test=require('node:test'),assert=require('node:assert/strict'),prisma=require('../src/config/prisma');
const tasks=require('../src/controllers/tasksController'),projects=require('../src/controllers/projectsController');
const reply=()=>({code:200,status(n){this.code=n;return this},json(data){this.body=data;return this}});
test('ambos os Kanbans recebem contagens reais de comentários e anexos',async()=>{
 const id=require('crypto').randomUUID();let project,task;
 try{
 const user=await prisma.user.create({data:{id,name:'Teste contadores',email:id+'@example.invalid',cpf:id,password:'unused',role:'employee'}});
 project=await prisma.project.create({data:{name:'Teste Kanban temporário',managerId:id,members:{connect:{id}}}});
 task=await prisma.task.create({data:{title:'Teste contadores temporário',projectId:project.id,assigneeId:id,comments:{create:{content:'Comentário temporário',userId:id}},attachments:{create:[{fileName:'a.txt',fileUrl:'/test-only/a',userId:id},{fileName:'b.txt',fileUrl:'/test-only/b',userId:id}]}}});
 const list=reply();await tasks.getAll({user,query:{projectId:project.id}},list);assert.equal(list.code,200);assert.deepEqual(list.body.find(t=>t.id===task.id)._count,{comments:1,attachments:2});
 const detail=reply();await projects.getById({user,params:{id:project.id}},detail);assert.equal(detail.code,200);assert.deepEqual(detail.body.tasks[0]._count,{comments:1,attachments:2});assert.equal(detail.body.tasks[0].assignee.id,id);
 }finally{
 if(task){await prisma.comment.deleteMany({where:{taskId:task.id}});await prisma.taskAttachment.deleteMany({where:{taskId:task.id}});await prisma.task.delete({where:{id:task.id}});}
 if(project)await prisma.project.delete({where:{id:project.id}});await prisma.user.deleteMany({where:{id}});await prisma.$disconnect();
 }
});
