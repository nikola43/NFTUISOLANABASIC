import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { AlertState, getAtaForMint, toDate } from './utils';
import {
    awaitTransactionSignatureConfirmation,
    CandyMachineAccount,
    getCandyMachineState,
    mintOneToken,
    SetupState,
} from "./candy-machine";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from "@solana/web3.js";



const getCandyMachineId = (): anchor.web3.PublicKey | undefined => {
    try {
        const candyMachineId = new anchor.web3.PublicKey(
            process.env.REACT_APP_CANDY_MACHINE_ID!,
        );

        return candyMachineId;
    } catch (e) {
        console.log('Failed to construct CandyMachineId', e);
        return undefined;
    }
};



export const Home = () => {

    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
    const [balance, setBalance] = useState(0); // true when user got to press MINT
    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });
    const { connection } = useConnection();



    const wallet = useWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();



    const anchorWallet = useMemo(() => {
        if (
            !wallet ||
            !wallet.publicKey ||
            !wallet.signAllTransactions ||
            !wallet.signTransaction
        ) {
            return;
        }

        return {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
        } as anchor.Wallet;
    }, [wallet]);



    useEffect(() => {
        (async () => {
            if (anchorWallet) {
                const balance = await connection.getBalance(anchorWallet!.publicKey);
                setBalance(balance);
                console.log("anchorWallet")
                console.log(anchorWallet)

                console.log("candyMachineId")
                const candyMachineId = getCandyMachineId();
                console.log(candyMachineId)



                if (candyMachineId) {
                    const cndy = await getCandyMachineState(
                        anchorWallet,
                        candyMachineId,
                        connection
                    );

                    console.log({
                        cndy
                    })




                    setCandyMachine(cndy)
                }



            }
        })();
    }, [anchorWallet]);


    /*
    useEffect(() => {
        (async () => {
            console.log("useEffect")
            console.log(anchorWallet)


            const candyMachineId = getCandyMachineId();

            if (anchorWallet && candyMachineId) {


                console.log({
                    anchorWallet
                })

                const cndy = await getCandyMachineState(
                    anchorWallet,
                    candyMachineId
                );



                setCandyMachine(cndy)



            }
        })();
    }, [anchorWallet]);

*/

    const onMint = async () => {

        try {




            if (anchorWallet && candyMachine) {

                console.log({
                    candyMachine
                })
                if (wallet.connected && candyMachine && wallet.publicKey) {



                    console.log("onMint")


                    const mint = anchor.web3.Keypair.generate();
                    let mintResult = await mintOneToken(
                        candyMachine,
                        wallet.publicKey,
                        mint,
                        connection,
                    );
                }
            }


        } catch (error: any) {

            console.log({
                error
            })
        } finally {

        }
    };





    return (
        <main>





            <button onClick={onMint}>
                onMint
            </button>



            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({ ...alertState, open: false })}
            >
                <Alert
                    onClose={() => setAlertState({ ...alertState, open: false })}
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main >
    );
};


export default Home;
