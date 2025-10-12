// services/pushNotificationService.ts
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';

// Configurar o canal de notificação (Android)
export const configurePushNotifications = () => {
  PushNotification.configure({
    // (Opcional) Chamado quando o token é gerado
    onRegister: function (token) {
      console.log('TOKEN:', token);
    },

    // (Obrigatório) Chamado quando uma notificação remota ou local é recebida ou aberta
    onNotification: function (notification) {
      console.log('NOTIFICATION:', notification);
      
      // Processar a notificação
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    },

    // Permissões
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Solicitar permissões no início
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  // Criar canal de notificação (Android 8+)
  PushNotification.createChannel(
    {
      channelId: "visitas-atrasadas",
      channelName: "Notificações de Visitas Atrasadas",
      channelDescription: "Notificações sobre visitantes com tempo estourado",
      playSound: true,
      soundName: "default",
      importance: 4,
      vibrate: true,
    },
    (created) => console.log(`Canal criado: ${created}`)
  );
};

// Função para enviar notificação local
export const sendLocalNotification = (title: string, message: string, data: any = {}) => {
  PushNotification.localNotification({
    /* Android Only Properties */
    channelId: "visitas-atrasadas",
    autoCancel: true,
    largeIcon: "ic_launcher",
    smallIcon: "ic_notification",
    bigText: message,
    subText: "Sistema Spulse",
    vibrate: true,
    vibration: 300,
    playSound: true,
    soundName: 'default',
    priority: "high",
    importance: "high",

    /* iOS and Android properties */
    title: title,
    message: message,
    allowWhileIdle: true,
    invokeApp: true, // Abre o app quando clicado
    
    // Dados customizados
    userInfo: data,
  });
};

// Agendar notificação local
export const scheduleLocalNotification = (title: string, message: string, date: Date, data: any = {}) => {
  PushNotification.localNotificationSchedule({
    channelId: "visitas-atrasadas",
    title: title,
    message: message,
    date: date,
    allowWhileIdle: true,
    userInfo: data,
  });
};

// Limpar todas as notificações
export const clearAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};

// Limpar badge do app
export const clearBadge = () => {
  PushNotification.setApplicationIconBadgeNumber(0);
};