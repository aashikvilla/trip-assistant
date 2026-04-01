import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [activeTab, setActiveTab] = useState("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TripMemberRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const { toast } = useToast();

  const roleOptions = [
    {
      value: "viewer" as TripMemberRole,
      label: "Viewer",
      icon: Eye,
      description: "Can view trip details but cannot edit",
    },
    {
      value: "editor" as TripMemberRole,
      label: "Editor",
      icon: Edit,
      description: "Can view and edit trip details",
    },
    {
      value: "owner" as TripMemberRole,
      label: "Owner",
      icon: Crown,
      description: "Full control over the trip",
    },
  ];

  const generateInvitation = async () => {
    setIsLoading(true);

    try {
      // Generate invitation code using the database function
      const { data: codeData, error: codeError } = await supabase.rpc(
        "generate_invitation_code"
      );

      if (codeError) throw codeError;

      const code = codeData;
      const token = crypto.randomUUID();

      // Create invitation record
      const { data, error } = await supabase
        .from("trip_invitations")
        .insert({
          trip_id: tripId,
          invited_by: (await supabase.auth.getUser()).data.user?.id || "",
          email: email || "placeholder@example.com", // For link/code invitations
          invitation_code: code,
          invitation_token: token,
          role: role,
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedCode(code);
      setInvitationToken(token);
      setShareableLink(`${window.location.origin}/invite/${token}`);

      toast({
        title: "Invitation created!",
        description: "Your invitation is ready to share.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error creating invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailInvitation = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to send the invitation.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await generateInvitation();

      // In a real app, you would send an email here
      // For now, we'll just show a success message
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${email}`,
      });

      setEmail("");
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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEmail("");
    setRole("viewer");
    setGeneratedCode("");
    setShareableLink("");
    setInvitationToken("");
    setActiveTab("email");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Member to {tripName}</DialogTitle>
          {/* <DialogDescription>
            Choose how you'd like to invite someone to join your trip
          </DialogDescription> */}
        </DialogHeader>

        <Tabs defaultValue="permanent-code" className="w-full">
          {/* commenting for now, would implement later
          
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="permanent-code" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Trip Code
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Code
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4">
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
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div> */}

          <TabsContent value="permanent-code" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Trip Code</CardTitle>
                <CardDescription>
                  Share this permanent code for others to join your trip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-4xl font-bold font-mono tracking-wider bg-muted p-6 rounded-lg">
                    {tripCode || "Loading..."}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(tripCode || "", "Trip Code")}
                  disabled={!tripCode}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  This code never expires and can be used multiple times
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={sendEmailInvitation}
                disabled={isLoading || !email.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a shareable link that anyone can use to join your trip.
              </p>

              {!shareableLink ? (
                <Button
                  onClick={generateInvitation}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Generate Shareable Link
                    </>
                  )}
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Shareable Link</CardTitle>
                    <CardDescription>
                      Anyone with this link can join your trip as a {role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={shareableLink}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(shareableLink, "Link")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This link expires in 7 days
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a 6-digit code that people can use to join your trip.
              </p>

              {!generatedCode ? (
                <Button
                  onClick={generateInvitation}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Hash className="h-4 w-4 mr-2" />
                      Generate Invitation Code
                    </>
                  )}
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Invitation Code</CardTitle>
                    <CardDescription>
                      Share this code for others to join as a {role}
                    </CardDescription>
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
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      This code expires in 7 days
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
