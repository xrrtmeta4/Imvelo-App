import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageSquare, Users, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";

export default function Campaigns() {
  const [busy, setBusy] = useState<string | null>(null);
  const [listId, setListId] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Open Imvelo");
  const [ctaUrl, setCtaUrl] = useState("https://imveloapp.lovable.app");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsCountry, setSmsCountry] = useState("");
  const [smsCategory, setSmsCategory] = useState<"advisory" | "early_warning">("advisory");

  const call = async (fn: string, body: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    } catch (e: any) {
      toast.error(e?.message || "Request failed");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const syncContacts = async () => {
    const d = await call("brevo-campaign", { action: "sync-contacts" }, "sync");
    if (d) {
      setListId(String(d.listId));
      toast.success(`Synced ${d.imported} contacts to list #${d.listId}`);
    }
  };

  const sendCampaign = async (send: boolean) => {
    if (!subject || !content || !listId || !senderEmail) {
      toast.error("Subject, message, list ID and sender email are required");
      return;
    }
    const d = await call(
      "brevo-campaign",
      {
        action: send ? "send-campaign" : "create-campaign",
        name: `Imvelo — ${subject}`.slice(0, 100),
        subject,
        title: title || subject,
        content: content.replace(/\n/g, "<br/>"),
        listId: Number(listId),
        senderEmail,
        ctaLabel,
        ctaUrl,
      },
      send ? "send" : "draft",
    );
    if (d) toast.success(send ? "Campaign sent" : "Draft campaign created in Brevo");
  };

  const sendSms = async () => {
    if (!smsMessage) { toast.error("Enter an SMS message"); return; }
    const d = await call(
      "brevo-sms",
      { broadcast: true, message: smsMessage, category: smsCategory, ...(smsCountry ? { country: smsCountry } : {}) },
      "sms",
    );
    if (d) toast.success(`SMS sent to ${d.sent} farmer(s)${d.failed ? `, ${d.failed} failed` : ""}`);
  };

  return (
    <main className="container max-w-3xl py-6 pb-28 space-y-6">
      <SEO title="Campaigns & SMS Advisory | Imvelo" description="Send branded Imvelo email campaigns and SMS early warnings or farming advisories to farmers." />
      <header>
        <h1 className="text-2xl font-bold">Campaigns & Advisory</h1>
        <p className="text-sm text-muted-foreground">Branded email campaigns and SMS alerts powered by Brevo.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Audience</CardTitle>
          <CardDescription>Sync Imvelo users into your Brevo contact list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={syncContacts} disabled={busy === "sync"}>
            {busy === "sync" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sync contacts
          </Button>
          <div className="space-y-1">
            <Label htmlFor="listId">Brevo list ID</Label>
            <Input id="listId" value={listId} onChange={(e) => setListId(e.target.value)} placeholder="e.g. 3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5" /> Email campaign</CardTitle>
          <CardDescription>Sent with the Imvelo brand template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="senderEmail">Sender email (verified in Brevo)</Label>
            <Input id="senderEmail" type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="hello@yourdomain.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="title">Headline</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to subject" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="content">Message</Label>
            <Textarea id="content" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ctaLabel">Button label</Label>
              <Input id="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ctaUrl">Button link</Label>
              <Input id="ctaUrl" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => sendCampaign(false)} disabled={busy !== null}>
              {busy === "draft" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save draft
            </Button>
            <Button onClick={() => sendCampaign(true)} disabled={busy !== null}>
              {busy === "send" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Send now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5" /> SMS advisory / early warning</CardTitle>
          <CardDescription>Reaches farmers without smartphones or data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={smsCategory === "advisory" ? "default" : "outline"} onClick={() => setSmsCategory("advisory")}>Farming advisory</Button>
            <Button size="sm" variant={smsCategory === "early_warning" ? "default" : "outline"} onClick={() => setSmsCategory("early_warning")}>Early warning</Button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="smsCountry">Country filter (optional)</Label>
            <Input id="smsCountry" value={smsCountry} onChange={(e) => setSmsCountry(e.target.value)} placeholder="e.g. Eswatini" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="smsMessage">Message (max 320 chars)</Label>
            <Textarea id="smsMessage" rows={3} maxLength={320} value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} />
          </div>
          <Button onClick={sendSms} disabled={busy !== null}>
            {busy === "sms" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Send SMS
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
