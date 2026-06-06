import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Delete, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";

const SERVICE_CODE = "*4800#";

function newSessionId() {
  return `imv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const UssdSimulator = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [screen, setScreen] = useState<string>(
    `Dial ${SERVICE_CODE} to start.`,
  );
  const [ended, setEnded] = useState(true);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill phone from profile
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.phone_number) setPhone(data.phone_number);
    })();
  }, [user]);

  const callGateway = async (nextText: string, sid: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ussd-4800", {
        body: {
          sessionId: sid,
          phoneNumber: phone,
          serviceCode: SERVICE_CODE,
          text: nextText,
        },
      });
      if (error) throw error;
      const screenText = String(data?.screen ?? "END Service error");
      const isEnd =
        Boolean(data?.end) || screenText.startsWith("END");
      // Strip the CON/END prefix for display
      const display = screenText.replace(/^(CON|END)\s?/, "");
      setScreen(display);
      setEnded(isEnd);
    } catch (e: any) {
      console.error("USSD error:", e);
      setScreen(`Service error. ${e?.message ?? ""}`.trim());
      setEnded(true);
      toast.error("USSD service unavailable");
    } finally {
      setBusy(false);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const dial = async () => {
    if (!phone || !/^\+?[0-9]{7,15}$/.test(phone)) {
      toast.error("Enter a valid phone number first (e.g. +268...)");
      return;
    }
    const sid = newSessionId();
    setSessionId(sid);
    setText("");
    setEnded(false);
    await callGateway("", sid);
  };

  const submit = async () => {
    if (ended || busy) return;
    const value = input.trim();
    if (!value) return;
    const nextText = text === "" ? value : `${text}*${value}`;
    setText(nextText);
    await callGateway(nextText, sessionId);
  };

  const hangUp = () => {
    setEnded(true);
    setText("");
    setSessionId("");
    setScreen(`Call ended. Dial ${SERVICE_CODE} to start again.`);
  };

  const keypad = useMemo(
    () => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"],
    [],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-card">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            Imvelo USSD ({SERVICE_CODE})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            In-app USSD experience — works without a SIM.
          </p>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card className="p-4 space-y-3">
          <label className="text-sm font-medium">Your phone number</label>
          <Input
            placeholder="+26876123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!ended}
          />
        </Card>

        {/* Phone screen */}
        <Card className="bg-black text-green-300 font-mono p-6 min-h-[260px] whitespace-pre-wrap text-base leading-relaxed">
          {busy ? "..." : screen}
        </Card>

        {/* Input row */}
        {!ended && (
          <Card className="p-3 space-y-3">
            <Input
              ref={inputRef}
              placeholder="Type reply (e.g. 1, 2, 3 or text)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={busy}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              {keypad.map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant="outline"
                  className="h-12 text-lg font-semibold"
                  onClick={() => setInput((v) => v + k)}
                  disabled={busy}
                >
                  {k}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setInput((v) => v.slice(0, -1))}
                disabled={busy || !input}
              >
                <Delete className="h-4 w-4 mr-1" /> Backspace
              </Button>
              <Button
                className="flex-1"
                onClick={submit}
                disabled={busy || !input.trim()}
              >
                Send
              </Button>
              <Button
                variant="destructive"
                onClick={hangUp}
                disabled={busy}
                aria-label="End call"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {ended && (
          <Button className="w-full h-12 text-base" onClick={dial} disabled={busy}>
            <Phone className="h-5 w-5 mr-2" /> Dial {SERVICE_CODE}
          </Button>
        )}
      </main>
    </div>
  );
};

export default UssdSimulator;