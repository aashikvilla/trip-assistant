import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Mail,
  Link as LinkIcon,
  Hash,
  Copy,
  Send,
  Users,
  Crown,
  Edit,
  Eye,
  Check,
  Loader2,
  Share2,
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripName: string;
  tripCode?: string;
}

type TripMemberRole = Database["public"]["Enums"]["trip_member_role"];

export const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  tripName,
  tripCode,
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TripMemberRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const roleOptions = [
    { value: "viewer" as TripMemberRole, label: "Viewer", icon: Eye, description: "Can view trip details" },
    { value: "editor" as TripMemberRole, label: "Editor", icon: Edit, description: "Can view and edit" },
    { value: "owner" as TripMemberRole, label: "Owner", icon: Crown, description: "Full control" },
  ];

  const generateInvitation = async () => {
    setIsLoading(true);
    try {
      const { data: codeData, error: codeError } = await supabase.rpc("generate_invitation_code");
      if (codeError) throw codeError;

      const code = codeData;
      const token = crypto.randomUUID();

      const { error } = await supabase
        .from("trip_invitations")
        .insert({
          trip_id: tripId,
          invited_by: user?.id || "",
          email: "link-invite@placeholder.local",
          invitation_code: code,
          invitation_token: token,
          role: role,
        });

      if (error) throw error;

      setGeneratedCode(code);
      setShareableLink(`${window.location.origin}/invite/${token}`);
      return { code, token, link: `${window.location.origin}/invite/${token}` };
    } catch (error: unknown) {
      toast({
        title: "Error creating invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailInvitation = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setEmailSent(false);

    try {
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          tripId,
          role,
          invitedBy: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to send invitation", variant: "destructive" });
        return;
      }

      setEmailSent(true);
      const hint = data.invitation?.userExists
        ? "They'll see a notification in the app."
        : "They'll get the invite when they sign up.";

      toast({
        title: "Invitation sent!",
        description: `Invitation created for ${email}. ${hint}`,
      });

      // Also show the link for sharing
      if (data.invitation?.link) {
        setShareableLink(data.invitation.link);
      }
    } catch (error: unknown) {
      toast({
        title: "Error sending invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const shareLink = async (link: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${tripName} on Vibe Trip`,
          text: `You're invited to join "${tripName}"! Click the link to join:`,
          url: link,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await copyToClipboard(link, "Link");
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${type} copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the text manually.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEmail("");
    setRole("viewer");
    setGeneratedCode("");
    setShareableLink("");
    setEmailSent(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite to {tripName}
          </DialogTitle>
        </DialogHeader>

        {/* Role selector */}
        <div className="space-y-2">
          <Label>Member Role</Label>
          <Select value={role} onValueChange={(value: TripMemberRole) => setRole(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">— {option.description}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email" className="text-xs gap-1">
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs gap-1">
              <LinkIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Link</span>
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs gap-1">
              <Hash className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Code</span>
            </TabsTrigger>
            <TabsTrigger value="trip-code" className="text-xs gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trip Code</span>
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailSent(false); }}
                />
                <p className="text-xs text-muted-foreground">
                  If they have an account, they'll get an in-app notification. Otherwise, share the invite link.
                </p>
              </div>

              <Button
                onClick={sendEmailInvitation}
                disabled={isLoading || !email.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                ) : emailSent ? (
                  <><Check className="h-4 w-4 mr-2" />Sent!</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Send Invitation</>
                )}
              </Button>

              {/* Show shareable link after sending */}
              {emailSent && shareableLink && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Share this link with them directly:
                    </p>
                    <div className="flex gap-2">
                      <Input value={shareableLink} readOnly className="font-mono text-xs" />
                      <Button size="sm" variant="outline" onClick={() => shareLink(shareableLink)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Shareable Link Tab */}
          <TabsContent value="link" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Generate a link anyone can use to join — like a WhatsApp group invite.
            </p>

            {!shareableLink ? (
              <Button onClick={generateInvitation} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><LinkIcon className="h-4 w-4 mr-2" />Generate Invite Link</>
                )}
              </Button>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Invite Link</CardTitle>
                  <CardDescription>Anyone with this link can join as {role}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input value={shareableLink} readOnly className="font-mono text-xs" />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(shareableLink, "Link")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={() => shareLink(shareableLink)} className="w-full" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Link
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Expires in 7 days</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 6-digit Code Tab */}
          <TabsContent value="code" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Generate a 6-digit code that people can enter on the app.
            </p>

            {!generatedCode ? (
              <Button onClick={generateInvitation} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Hash className="h-4 w-4 mr-2" />Generate Code</>
                )}
              </Button>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Invitation Code</CardTitle>
                  <CardDescription>Share for others to join as {role}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono tracking-wider bg-muted p-4 rounded-lg">
                      {generatedCode}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => copyToClipboard(generatedCode, "Code")}
                  >
                    <Copy className="h-4 w-4 mr-2" />Copy Code
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Expires in 7 days</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Permanent Trip Code Tab */}
          <TabsContent value="trip-code" className="space-y-4 pt-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Permanent Trip Code</CardTitle>
                <CardDescription>This code never expires — share it freely</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-4xl font-bold font-mono tracking-wider bg-muted p-6 rounded-lg">
                    {tripCode || "—"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(tripCode || "", "Trip Code")}
                  disabled={!tripCode}
                >
                  <Copy className="h-4 w-4 mr-2" />Copy Code
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Members enter this on the Dashboard &gt; Join Trip
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
