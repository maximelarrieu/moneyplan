"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstrumentDialog, type InstrumentData } from "./instrument-dialog";

export function EditInstrumentButton({ instrument }: { instrument: InstrumentData }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Modifier l'instrument ${instrument.symbol}`}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" aria-hidden="true" /> Modifier
      </Button>
      {open && (
        <InstrumentDialog instrument={instrument} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
