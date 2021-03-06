
import {
  SystemProgram,
  Transaction,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from '@solana/web3.js';
import { sendTransactions, SequenceType } from './connection';
import { Token, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token' // IGNORE THESE ERRORS IF ANY

import {
  CIVIC,
  getAtaForMint,
  getNetworkExpire,
  getNetworkToken,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
} from './utils';

import * as anchor from '@project-serum/anchor';

// export const CANDY_MACHINE_PROGRAM = new anchor.web3.PublicKey(
//   'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ',
// );

export const CANDY_MACHINE_PROGRAM = new anchor.web3.PublicKey(
  process.env.REACT_APP_CANDY_MACHINE_ID!,
);

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

interface CandyMachineState {
  itemsAvailable: number;
}

export interface CandyMachineAccount {
  id: anchor.web3.PublicKey;
  program: anchor.Program;
  state: CandyMachineState;
}

export const awaitTransactionSignatureConfirmation = async (
  txid: anchor.web3.TransactionSignature,
  timeout: number,
  connection: anchor.web3.Connection,
  queryStatus = false,
): Promise<anchor.web3.SignatureStatus | null | void> => {
  let done = false;
  let status: anchor.web3.SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log('Rejecting for timeout...');
      reject({ timeout: true });
    }, timeout);

    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              console.log('REST null result for', txid, status);
            } else if (status.err) {
              console.log('REST error for', txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log('REST no confirmations for', txid, status);
            } else {
              console.log('REST confirmation for', txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log('REST connection error: txid', txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  //@ts-ignore
  if (connection._signatureSubscriptions[subId]) {
    connection.removeSignatureListener(subId);
  }
  done = true;
  console.log('Returning status', status);
  return status;
};

const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  walletAddress: anchor.web3.PublicKey,
  splTokenMintAddress: anchor.web3.PublicKey,
) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
};

export const getCandyMachineState = async (
  anchorWallet: anchor.Wallet,
  candyMachineId: anchor.web3.PublicKey,
  connection: anchor.web3.Connection,
): Promise<CandyMachineAccount> => {


  const idlPlain = `{
        "version": "4.0.0",
        "name": "candy_machine",
        "instructions": [
          {
            "name": "initializeCandyMachine",
            "accounts": [
              {
                "name": "candyMachine",
                "isMut": true,
                "isSigner": false
              },
              {
                "name": "wallet",
                "isMut": false,
                "isSigner": false
              },
              {
                "name": "authority",
                "isMut": false,
                "isSigner": false
              },
              {
                "name": "payer",
                "isMut": false,
                "isSigner": true
              }
            ],
            "args": [
              {
                "name": "data",
                "type": {
                  "defined": "CandyMachineData"
                }
              }
            ]
          },
          {
            "name": "mintNft",
            "accounts": [
              {
                "name": "mintAuthority",
                "isMut": true,
                "isSigner": true
              },
              {
                "name": "mint",
                "isMut": true,
                "isSigner": false
              },
              {
                "name": "tokenProgram",
                "isMut": false,
                "isSigner": false
              },
              {
                "name": "metadata",
                "isMut": true,
                "isSigner": false
              },
              {
                "name": "tokenAccount",
                "isMut": true,
                "isSigner": false
              },
              {
                "name": "tokenMetadataProgram",
                "isMut": false,
                "isSigner": false
              },
              {
                "name": "payer",
                "isMut": true,
                "isSigner": false
              },
              {
                "name": "systemProgram",
                "isMut": false,
                "isSigner": false
              },
              {
                "name": "rent",
                "isMut": false,
                "isSigner": false
              },
              {
                "name": "masterEdition",
                "isMut": true,
                "isSigner": false
              }
            ],
            "args": [
              {
                "name": "creatorKey",
                "type": "publicKey"
              },
              {
                "name": "uri",
                "type": "string"
              },
              {
                "name": "title",
                "type": "string"
              }
            ]
          }
        ],
        "accounts": [
          {
            "name": "CandyMachine",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "authority",
                  "type": "publicKey"
                },
                {
                  "name": "wallet",
                  "type": "publicKey"
                },
                {
                  "name": "tokenMint",
                  "type": {
                    "option": "publicKey"
                  }
                },
                {
                  "name": "itemsRedeemed",
                  "type": "u64"
                },
                {
                  "name": "data",
                  "type": {
                    "defined": "CandyMachineData"
                  }
                }
              ]
            }
          },
          {
            "name": "CollectionPDA",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "mint",
                  "type": "publicKey"
                },
                {
                  "name": "candyMachine",
                  "type": "publicKey"
                }
              ]
            }
          }
        ],
        "types": [
          {
            "name": "CandyMachineData",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "uuid",
                  "type": "string"
                },
                {
                  "name": "price",
                  "type": "u64"
                },
                {
                  "name": "symbol",
                  "type": "string"
                },
                {
                  "name": "hiddenSettings",
                  "type": {
                    "option": {
                      "defined": "HiddenSettings"
                    }
                  }
                },
                {
                  "name": "itemsAvailable",
                  "type": "u64"
                }
              ]
            }
          },
          {
            "name": "ConfigLine",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "name",
                  "type": "string"
                },
                {
                  "name": "uri",
                  "type": "string"
                }
              ]
            }
          },
          {
            "name": "EndSettings",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "endSettingType",
                  "type": {
                    "defined": "EndSettingType"
                  }
                },
                {
                  "name": "number",
                  "type": "u64"
                }
              ]
            }
          },
          {
            "name": "Creator",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "address",
                  "type": "publicKey"
                },
                {
                  "name": "verified",
                  "type": "bool"
                },
                {
                  "name": "share",
                  "type": "u8"
                }
              ]
            }
          },
          {
            "name": "HiddenSettings",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "name",
                  "type": "string"
                },
                {
                  "name": "uri",
                  "type": "string"
                },
                {
                  "name": "hash",
                  "type": {
                    "array": [
                      "u8",
                      32
                    ]
                  }
                }
              ]
            }
          },
          {
            "name": "WhitelistMintSettings",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "mode",
                  "type": {
                    "defined": "WhitelistMintMode"
                  }
                },
                {
                  "name": "mint",
                  "type": "publicKey"
                },
                {
                  "name": "presale",
                  "type": "bool"
                },
                {
                  "name": "discountPrice",
                  "type": {
                    "option": "u64"
                  }
                }
              ]
            }
          },
          {
            "name": "GatekeeperConfig",
            "type": {
              "kind": "struct",
              "fields": [
                {
                  "name": "gatekeeperNetwork",
                  "type": "publicKey"
                },
                {
                  "name": "expireOnUse",
                  "type": "bool"
                }
              ]
            }
          },
          {
            "name": "EndSettingType",
            "type": {
              "kind": "enum",
              "variants": [
                {
                  "name": "Date"
                },
                {
                  "name": "Amount"
                }
              ]
            }
          },
          {
            "name": "WhitelistMintMode",
            "type": {
              "kind": "enum",
              "variants": [
                {
                  "name": "BurnEveryTime"
                },
                {
                  "name": "NeverBurn"
                }
              ]
            }
          }
        ],
        "errors": [
          {
            "code": 6000,
            "name": "IncorrectOwner",
            "msg": "Account does not have correct owner!"
          },
          {
            "code": 6001,
            "name": "Uninitialized",
            "msg": "Account is not initialized!"
          },
          {
            "code": 6002,
            "name": "MintMismatch",
            "msg": "Mint Mismatch!"
          },
          {
            "code": 6003,
            "name": "IndexGreaterThanLength",
            "msg": "Index greater than length!"
          },
          {
            "code": 6004,
            "name": "NumericalOverflowError",
            "msg": "Numerical overflow error!"
          },
          {
            "code": 6005,
            "name": "TooManyCreators",
            "msg": "Can only provide up to 4 creators to candy machine (because candy machine is one)!"
          },
          {
            "code": 6006,
            "name": "UuidMustBeExactly6Length",
            "msg": "Uuid must be exactly of 6 length"
          },
          {
            "code": 6007,
            "name": "NotEnoughTokens",
            "msg": "Not enough tokens to pay for this minting"
          },
          {
            "code": 6008,
            "name": "NotEnoughSOL",
            "msg": "Not enough SOL to pay for this minting"
          },
          {
            "code": 6009,
            "name": "TokenTransferFailed",
            "msg": "Token transfer failed"
          },
          {
            "code": 6010,
            "name": "CandyMachineEmpty",
            "msg": "Candy machine is empty!"
          },
          {
            "code": 6011,
            "name": "CandyMachineNotLive",
            "msg": "Candy machine is not live!"
          },
          {
            "code": 6012,
            "name": "HiddenSettingsConfigsDoNotHaveConfigLines",
            "msg": "Configs that are using hidden uris do not have config lines, they have a single hash representing hashed order"
          },
          {
            "code": 6013,
            "name": "CannotChangeNumberOfLines",
            "msg": "Cannot change number of lines unless is a hidden config"
          },
          {
            "code": 6014,
            "name": "DerivedKeyInvalid",
            "msg": "Derived key invalid"
          },
          {
            "code": 6015,
            "name": "PublicKeyMismatch",
            "msg": "Public key mismatch"
          },
          {
            "code": 6016,
            "name": "NoWhitelistToken",
            "msg": "No whitelist token present"
          },
          {
            "code": 6017,
            "name": "TokenBurnFailed",
            "msg": "Token burn failed"
          },
          {
            "code": 6018,
            "name": "GatewayAppMissing",
            "msg": "Missing gateway app when required"
          },
          {
            "code": 6019,
            "name": "GatewayTokenMissing",
            "msg": "Missing gateway token when required"
          },
          {
            "code": 6020,
            "name": "GatewayTokenExpireTimeInvalid",
            "msg": "Invalid gateway token expire time"
          },
          {
            "code": 6021,
            "name": "NetworkExpireFeatureMissing",
            "msg": "Missing gateway network expire feature when required"
          },
          {
            "code": 6022,
            "name": "CannotFindUsableConfigLine",
            "msg": "Unable to find an unused config line near your random number index"
          },
          {
            "code": 6023,
            "name": "InvalidString",
            "msg": "Invalid string"
          },
          {
            "code": 6024,
            "name": "SuspiciousTransaction",
            "msg": "Suspicious transaction detected"
          },
          {
            "code": 6025,
            "name": "CannotSwitchToHiddenSettings",
            "msg": "Cannot Switch to Hidden Settings after items available is greater than 0"
          },
          {
            "code": 6026,
            "name": "IncorrectSlotHashesPubkey",
            "msg": "Incorrect SlotHashes PubKey"
          },
          {
            "code": 6027,
            "name": "IncorrectCollectionAuthority",
            "msg": "Incorrect collection NFT authority"
          },
          {
            "code": 6028,
            "name": "MismatchedCollectionPDA",
            "msg": "Collection PDA address is invalid"
          },
          {
            "code": 6029,
            "name": "MismatchedCollectionMint",
            "msg": "Provided mint account doesn't match collection PDA mint"
          },
          {
            "code": 6030,
            "name": "SlotHashesEmpty",
            "msg": "Slot hashes Sysvar is empty"
          },
          {
            "code": 6031,
            "name": "MetadataAccountMustBeEmpty",
            "msg": "The metadata account has data in it, and this must be empty to mint a new NFT"
          },
          {
            "code": 6032,
            "name": "MissingSetCollectionDuringMint",
            "msg": "Missing set collection during mint IX for Candy Machine with collection set"
          },
          {
            "code": 6033,
            "name": "NoChangingCollectionDuringMint",
            "msg": "Can't change collection settings after items have begun to be minted"
          },
          {
            "code": 6034,
            "name": "CandyCollectionRequiresRetainAuthority",
            "msg": "Retain authority must be true for Candy Machines with a collection set"
          }
        ],
        "metadata": {
          "address": "JApKQ5eDrGL1HWa2P1pFBGXAeRwZj98iXxecqagbxGBM"
        }
      }`;

  // const idl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM, provider);
  const idl = JSON.parse(
    idlPlain
  );



  const provider = new anchor.Provider(connection, anchorWallet, {
    preflightCommitment: 'recent',
  });

  const program = new anchor.Program(idl!, process.env.REACT_APP_CANDY_MACHINE_ID!, provider);

  console.log(program);

  // const state: any = await program.account.candyMachine.fetch(candyMachineId);
  // const itemsAvailable = state.data.itemsAvailable.toNumber();
  // const itemsRedeemed = state.itemsRedeemed.toNumber();
  // const itemsRemaining = itemsAvailable - itemsRedeemed;

  // return {
  //   id: candyMachineId,
  //   program,
  //   state: {
  //     authority: state.authority,
  //     itemsAvailable,
  //     itemsRedeemed,
  //     itemsRemaining,
  //     isSoldOut: itemsRemaining === 0,
  //     isActive: false,
  //     isPresale: false,
  //     isWhitelistOnly: false,
  //     goLiveDate: state.data.goLiveDate,
  //     treasury: state.wallet,
  //     tokenMint: state.tokenMint,
  //     gatekeeper: state.data.gatekeeper,
  //     endSettings: state.data.endSettings,
  //     whitelistMintSettings: state.data.whitelistMintSettings,
  //     hiddenSettings: state.data.hiddenSettings,
  //     price: state.data.price,
  //     retainAuthority: state.data.retainAuthority,
  //   },
  // };

  return {
    id: candyMachineId,
    program,
    state: {
      itemsAvailable: 10
    },
  };
};

const getMasterEdition = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const getMetadata = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getCandyMachineCreator = async (
  candyMachine: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('candy_machine'), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM,
  );
};

export const getCollectionPDA = async (
  candyMachineAddress: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('collection'), candyMachineAddress.toBuffer()],
    CANDY_MACHINE_PROGRAM,
  );
};

export interface CollectionData {
  mint: anchor.web3.PublicKey;
  candyMachine: anchor.web3.PublicKey;
}

export const getCollectionAuthorityRecordPDA = async (
  mint: anchor.web3.PublicKey,
  newAuthority: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('collection_authority'),
        newAuthority.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export type SetupState = {
  mint: anchor.web3.Keypair;
  userTokenAccount: anchor.web3.PublicKey;
  transaction: string;
};

export const createAccountsForMint = async (
  candyMachine: CandyMachineAccount,
  payer: anchor.web3.PublicKey,
): Promise<SetupState> => {
  const mint = anchor.web3.Keypair.generate();
  const userTokenAccountAddress = (
    await getAtaForMint(mint.publicKey, payer)
  )[0];

  const signers: anchor.web3.Keypair[] = [mint];
  const instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports:
        await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
          MintLayout.span,
        ),
      programId: TOKEN_PROGRAM_ID,
    }),
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      payer,
      payer,
    ),
    createAssociatedTokenAccountInstruction(
      userTokenAccountAddress,
      payer,
      payer,
      mint.publicKey,
    ),
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccountAddress,
      payer,
      [],
      1,
    ),
  ];

  return {
    mint: mint,
    userTokenAccount: userTokenAccountAddress,
    transaction: (
      await sendTransactions(
        candyMachine.program.provider.connection,
        payer,
        [instructions],
        [signers],
        SequenceType.StopOnFailure,
        'singleGossip',
        () => { },
        () => false,
        undefined,
        [],
        [],
      )
    ).txs[0].txid,
  };
};

type MintResult = {
  mintTxId: string;
  metadataKey: anchor.web3.PublicKey;
};

export const mintOneToken = async (
  candyMachine: CandyMachineAccount,
  payer: anchor.web3.PublicKey,
  mint: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
  beforeTransactions: Transaction[] = [],
  afterTransactions: Transaction[] = [],
  setupState?: SetupState,
): Promise<MintResult | null> => {
  const userTokenAccountAddress = (
    await getAtaForMint(mint.publicKey, payer)
  )[0];

  const userPayingAccountAddress = payer;

  const candyMachineAddress = candyMachine.id;
  const remainingAccounts = [];
  const instructions = [];
  const signers: anchor.web3.Keypair[] = [];
  console.log('SetupState: ', setupState);
  if (!setupState) {
    signers.push(mint);
    instructions.push(
      ...[
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint.publicKey,
          space: MintLayout.span,
          lamports:
            await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
              MintLayout.span,
            ),
          programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
          TOKEN_PROGRAM_ID,
          mint.publicKey,
          0,
          payer,
          payer,
        ),
        createAssociatedTokenAccountInstruction(
          userTokenAccountAddress,
          payer,
          payer,
          mint.publicKey,
        ),
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          mint.publicKey,
          userTokenAccountAddress,
          payer,
          [],
          1,
        ),
      ],
    );
  }

  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);

  const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
    candyMachineAddress,
  );

  signers.push(mint);
  instructions.push(
    ...[
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span,
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        0,
        payer,
        payer,
      ),
      createAssociatedTokenAccountInstruction(
        userTokenAccountAddress,
        payer,
        payer,
        mint.publicKey,
      ),
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        userTokenAccountAddress,
        payer,
        [],
        1,
      ),
    ],
  );

  instructions.push(
    await candyMachine.program.instruction.mintNft(
      mint.publicKey,
      "https://s3.eu-central-1.wasabisys.com/somefiles/0.json",
      "John NFT",
      {
        accounts: {
          mintAuthority: payer,
          mint: mint.publicKey,
          tokenAccount: userTokenAccountAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadata: metadataAddress,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          payer: payer,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          masterEdition: masterEdition,
        },
      }),
  );

  const [collectionPDA] = await getCollectionPDA(candyMachineAddress);
  const collectionPDAAccount =
    await candyMachine.program.provider.connection.getAccountInfo(
      collectionPDA,
    );

  console.log(candyMachine);

  const instructionsMatrix = [instructions];
  const signersMatrix = [signers];


  /*
      connection: Connection,
      wallet: any,
      instructionSet: TransactionInstruction[][],
      signersSet: Keypair[][],
      sequenceType: SequenceType = SequenceType.Parallel,
      commitment: Commitment = 'singleGossip',
      successCallback: (txid: string, ind: number) => void = (txid, ind) => {},
      failCallback: (reason: string, ind: number) => boolean = (txid, ind) => false,
      block?: BlockhashAndFeeCalculator,
      beforeTransactions: Transaction[] = [],
      afterTransactions: Transaction[] = [],
  */

  try {
    const txns = (
      await sendTransactions(
        candyMachine.program.provider.connection,
        candyMachine.program.provider.wallet,
        instructionsMatrix,
        signersMatrix,
        SequenceType.StopOnFailure,
        'singleGossip',
        () => { },
        () => false,
        undefined,
        beforeTransactions,
        afterTransactions,
      )
    ).txs.map(t => t.txid);
    const mintTxn = txns[0];
    return {
      mintTxId: mintTxn,
      metadataKey: metadataAddress,
    };
  } catch (e) {
    console.log(e);
  }
  return null;
};

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
