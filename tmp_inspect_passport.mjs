(async ()=>{
  try{
    const mod = await import('./src/config/passport.js');
    console.log('exports:', Object.keys(mod));
    console.log('passport export exists:', !!mod.passport);
  }catch(e){
    console.error('import failed:', e.stack||e);
    process.exit(1);
  }
})();
