function luhnCheck(num){
  const digits = num.replace(/\D/g, "");
  if(digits.length===0) return false;
  let sum=0, alt=false;
  for(let i=digits.length-1;i>=0;i--){
    let n=parseInt(digits[i],10);
    if(alt){ n*=2; if(n>9) n-=9; }
    sum+=n; alt=!alt;
  }
  return sum%10===0;
}
function calcLuhnCheckDigit(partial){
  const digits = partial.replace(/\D/g, "");
  let sum=0, alternate=true;
  for(let i=digits.length-1;i>=0;i--){
    let n=parseInt(digits[i],10);
    if(alternate){ n*=2; if(n>9) n-=9; }
    sum+=n; alternate=!alternate;
  }
  return (10-(sum%10))%10;
}
function generateFromPattern(pattern, count){
  const results=[]; const seen=new Set();
  const isAmex = pattern.startsWith('34')||pattern.startsWith('37');
  const targetLen = isAmex?15:16;
  for(let attempt=0; attempt<count*20 && results.length<count; attempt++){
    let card='';
    for(let i=0;i<pattern.length;i++){
      card += pattern[i].toLowerCase()==='x' ? Math.floor(Math.random()*10).toString() : pattern[i];
    }
    while(card.length<targetLen) card += Math.floor(Math.random()*10).toString();
    card = card.substring(0,targetLen);
    const partial = card.substring(0, targetLen-1);
    card = partial + calcLuhnCheckDigit(partial).toString();
    if(!seen.has(card)){ seen.add(card); results.push({number:card, luhnValid: luhnCheck(card)}); }
  }
  return results;
}
const pattern = '3703827x9x4xxxxx';
const out = generateFromPattern(pattern, 20);
for(const o of out){ console.log(o.number, 'len='+o.number.length, 'luhn='+o.luhnValid); }
console.log('Generated', out.length);
