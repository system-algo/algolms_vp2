import {inputAt,replaceInput,expressionDepth,reporterValue,canDropReporter} from './reporterBlocks.js';
export function findCommand(blocks,id){for(const block of blocks){if(block.id===id)return block;const found=findCommand(block.children||[],id);if(found)return found;}}
export function updateInputTree(blocks,target,value){
 return blocks.map(block=>block.id===target.blockId?{...block,params:{...block.params,[target.param]:replaceInput(block.params?.[target.param],target.path||[],value)}}:{...block,...(block.children?{children:updateInputTree(block.children,target,value)}:{})});
}
export function removeCommand(blocks,id){return blocks.filter(b=>b.id!==id).map(b=>({...b,...(b.children?{children:removeCommand(b.children,id)}:{})}));}
export function canConnect(blocks,block,target){
 if(!canDropReporter(block,target))return false;
 const owner=findCommand(blocks,target.blockId);if(!owner)return false;
 if((target.path||[]).length+expressionDepth(reporterValue(block))>12)return false;
 const source=block.sourceInput;
 if(source?.blockId===target.blockId&&source.param===target.param&&(source.path||[]).every((key,i)=>key===target.path?.[i]))return false;
 return true;
}
export function connectReporter(blocks,block,target){
 if(!canConnect(blocks,block,target))return blocks;
 let result=blocks;
 if(block.sourceInput)result=updateInputTree(result,block.sourceInput,null);
 else if(!block.isFromToolbox)result=removeCommand(result,block.id);
 return updateInputTree(result,target,reporterValue(block));
}
export function readInputTree(blocks,target){return inputAt(findCommand(blocks,target.blockId)?.params?.[target.param],target.path);}
