
import Twilio from 'twilio/lib/rest/Twilio.js';
import { ACCOUNT_SID, AUTH_TOKEN } from '../src/env.js';


const client = new Twilio(ACCOUNT_SID, AUTH_TOKEN); 

const sendSMSMessage = async ( {to, from, subject, content } ) => { 
    try{
        const body = `${subject}/n${content}`; 
        let messageInstance = await client.messages.create(
            {
                body,
                from,
                to
            }
        )

        return messageInstance; 
    }catch (error){
        console.log(`ERROR: ${error}`); 
    }
}

export default sendSMSMessage; 