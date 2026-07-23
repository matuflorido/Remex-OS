const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.adminChangePassword = functions.https.onCall(async (data, context) => {
  // TOLERANCIA A FALLOS: Extraemos los datos dependiendo de cómo los haya empaquetado el cliente React
  const payload = data.uid ? data : (data.data || {});
  
  const uid = payload.uid;
  const newPassword = payload.newPassword;
  const adminToken = payload.adminToken;

  // Si sigue faltando algo, devolvemos exactamente qué variable llegó vacía
  if (!uid || !newPassword || !adminToken) {
    throw new functions.https.HttpsError(
      "invalid-argument", 
      `Faltan datos -> uid: ${uid ? 'OK' : 'FALTA'}, password: ${newPassword ? 'OK' : 'FALTA'}, token: ${adminToken ? 'OK' : 'FALTA'}`
    );
  }

  try {
    // 1. Verificamos el token manualmente para asegurarnos de que eres tú
    await admin.auth().verifyIdToken(adminToken);

    // 2. Forzamos el cambio de contraseña
    await admin.auth().updateUser(uid, {
      password: newPassword
    });
    
    return { success: true, message: "Contraseña actualizada con éxito" };
  } catch (error) {
    console.error("Error cambiando clave:", error);
    throw new functions.https.HttpsError("internal", "Error interno al cambiar clave: " + error.message);
  }
});