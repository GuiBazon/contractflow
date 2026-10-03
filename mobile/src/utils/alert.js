import { Alert as NativeAlert, Platform } from 'react-native';
// Alert nativo no celular; a prévia web precisa de um diálogo do navegador.
export const Alert = {
  alert(title, message, buttons = [{ text: 'OK' }]) {
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, buttons);
    const action = buttons.find((button) => button.style !== 'cancel');
    const text = title + '\n' + (message || '');
    if (buttons.some((button) => button.style === 'cancel')) {
      if (window.confirm(text)) action?.onPress?.();
    } else { window.alert(text); action?.onPress?.(); }
  },
};
