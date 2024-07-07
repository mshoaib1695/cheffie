import AES from 'crypto-js/aes';
import CryptoJS from "crypto-js"
import dotenv from "dotenv";
dotenv.config();

const encryptAES = (text) => (AES.encrypt(text, process.env.AUTH_PASS_PHRASE).toString())

const decryptAES = (encryptedText) => {
    const bytes = AES.decrypt(encryptedText, process.env.AUTH_PASS_PHRASE);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export {
    encryptAES,
    decryptAES
}