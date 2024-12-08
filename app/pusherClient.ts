// pusherClient.ts
import Pusher from 'pusher-js';
import asyncStorage from "@react-native-async-storage/async-storage/src/AsyncStorage";

let pusher: Pusher | null = null;

export const getPusherClient = (order_id: string | undefined) => {
    if (!pusher) {
         pusher = new Pusher('944c0ebb45844385955c', {
            cluster: 'sa1',
        });

}
    return pusher;
};
