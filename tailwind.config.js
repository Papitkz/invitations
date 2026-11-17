export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  corePlugins: { preflight: false }, // keep Vuetify's own reset
  theme: {
    extend: {
      colors: { ink: '#1b3a6b', deep: '#1f4a8a', azure: '#2b58ab', peri: '#8c9cf0', sky: '#cfe2fa', mist: '#eef5fd' },
      fontFamily: {
        script: ['Allura', 'Snell Roundhand', 'Apple Chancery', 'cursive'],
        caps: ['Cinzel', 'Trajan Pro', 'Georgia', 'serif'],
        body: ['Cormorant Garamond', 'Georgia', 'serif']
      }
    }
  }
}
