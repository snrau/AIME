export function clonePlain(value) {
  //console.log('plain', value);
  const item = value.map((item) => ({ ...item }));
  //console.log('cloned plain', item);
  return item;
}

export function cloneMelody(value) {
  //console.log('melody', value);
  const item = value.map((item) => item.map((i) => ({ ...i })));
  //console.log('cloned melody', item);
  return item;
}

export function cloneSequence(value){
  return JSON.parse(JSON.stringify(value));
}

export function cloneGrid(value) {
  //console.log('grid', value);
  const item = Object.values(value).map((cell) => ({ ...cell }));
  //console.log('cloned grid', item);
  return item;
}

export function cloneHistory(value) {
  //console.log('history', value);
  const item = Object.values(value).map((row) => Object.values(row).map((cell) => ({ ...cell })));
  //console.log('cloned history', item);
  return item;
}