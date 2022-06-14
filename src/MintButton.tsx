import { useEffect, useState } from 'react';
import Button from '@material-ui/core/Button';
import { CircularProgress } from '@material-ui/core';
import { CandyMachineAccount } from './candy-machine';


export const MintButton = ({
    onMint,
    candyMachine,
    isMinting
}: {
    onMint: () => Promise<void>;
    candyMachine?: CandyMachineAccount;
    isMinting: boolean
}) => {

    const [clicked, setClicked] = useState(false);


    useEffect(() => {

        onMint();

    }, [clicked, setClicked, onMint]);

    return (
        <button
            disabled={
                clicked
            }
            onClick={async () => {

                console.log('Minting...');
                await onMint();

            }}
        >
            MINT
        </button>
    );
};
