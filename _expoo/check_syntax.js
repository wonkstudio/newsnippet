const babel = require('@babel/core');

try {
  babel.transformFileSync('App.js', {
    presets: ['@babel/preset-react']
  });
  console.log('✅ No syntax errors!');
} catch (err) {
  console.error(err.message);
}
