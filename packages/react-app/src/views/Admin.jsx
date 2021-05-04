/* eslint-disable jsx-a11y/accessible-emoji */

import React, { useState } from "react";
import { Button, Input, InputNumber, Divider, Image } from "antd";
import { parseEther, formatEther } from "@ethersproject/units";
import { AddressZero } from "@ethersproject/constants";
import { AddressInput, ManagedRaffle } from "../components";
import { DEFAULT_TICKET_URI } from "../constants";

import { useContractReader, useContractLoader, useFetch } from "../hooks";

export default function Admin({ tx, provider }) {
  const contracts = useContractLoader(provider);

  const [dest, setDest] = useState("");

  const [numTickets, setNumTickets] = useState(100);
  const [ticketPrice, setTicketPrice] = useState("0.01");
  const [benefactorAddress, setBenefactorAddress] = useState("");
  const [benefactorName, setBenefactorName] = useState("");
  const [ticketURI, setTicketURI] = useState(DEFAULT_TICKET_URI);

  const ticketPreview = useFetch(ticketURI)?.image;

  // Contract-level filtering confines us to static arrays,
  // so we have to filter out the Address-Zero entries here
  const managedRaffles = (useContractReader(contracts, "RaffleFactory", "getManagedRaffles") || []).filter(
    r => r !== AddressZero,
  );

  return (
    <div>
      <div>Raffle Management Contract Address: {contracts?.RaffleFactory?.address}</div>
      <div style={{ border: "1px solid #cccccc", padding: 16, width: "80%", margin: "auto", marginTop: 64 }}>
        <h2> Your managed raffles: </h2>
        {managedRaffles.map(raffleAddress => {
          return (
            <div key={raffleAddress}>
              <ManagedRaffle raffleAddress={raffleAddress} provider={provider} tx={tx} contracts={contracts} />
              <Divider />
            </div>
          );
        })}
      </div>
      <div style={{ border: "1px solid #cccccc", padding: 16, width: "80%", margin: "auto", marginTop: 64 }}>
        <h2>Launch a new Raffle:</h2>
        <div style={{ margin: 8 }}>
          Num Tickets :
          <InputNumber
            onChange={e => {
              setNumTickets(e.toString());
            }}
            value={numTickets}
          />
          Ticket Price (ETH):
          <InputNumber
            onChange={e => {
              setTicketPrice(e.toString());
            }}
            value={ticketPrice}
          />
          Benefactor Address:
          <div style={{ width: 350, padding: 16, margin: "auto" }}>
            {/*
      ENS lets you use real-name aliases for addresses
      Could potentially use this instead of benefactor address...
      We'll fall back to the explicitly given name though
    */}
            <AddressInput
              // ensProvider={provider}
              value={benefactorAddress}
              onChange={addr => {
                setBenefactorAddress(addr);
              }}
            />
          </div>
          {/* might not have a name if benefactor is just the artist or some for-profit endeavour where
  it's not really the focus on who is getting the proceeds */}
          Benefactor Name (Optional):
          <Input
            onChange={e => {
              setBenefactorName(e.target.value);
            }}
            value={benefactorName}
          />
          Ticket URI:
          <Input
            onChange={e => {
              setTicketURI(e.target.value);
            }}
            value={ticketURI}
          />
          Ticket Preview:
          {ticketPreview ? <Image src={ticketPreview} width={100} height={100} /> : ""}
          {/* TODO refresh upon transaction complete instead of waiting for poll.. */}
          <Button
            onClick={() => {
              tx(
                contracts.RaffleFactory.createRaffle(
                  Number(numTickets),
                  parseEther(ticketPrice),
                  benefactorAddress,
                  benefactorName,
                  // TODO make customizable.
                  DEFAULT_TICKET_URI,
                ),
              );
            }}
          >
            Launch Raffle
          </Button>
        </div>
        <div>After launching, donor must sent the prize NFT to the address of the raffle.</div>
      </div>
    </div>
  );
}
