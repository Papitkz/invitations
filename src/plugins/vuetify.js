import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'invite',
    themes: {
      invite: {
        dark: false,
        colors: {
          primary: '#1f4a8a',
          secondary: '#8c9cf0',
          info: '#3f78c6',
          background: '#eef5fd',
          surface: '#ffffff',
          error: '#b3343f'
        }
      }
    }
  },
  defaults: {
    VBtn: { rounded: 'pill', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable', rounded: 'pill', hideDetails: true },
    VChip: { variant: 'flat' }
  }
})
