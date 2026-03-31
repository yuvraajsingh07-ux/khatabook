import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { 
  useGetLedger, 
  useUpdateLedger,
  getGetLedgerQueryKey,
  getGetLedgersQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, CreditCard, Save, Phone, Banknote, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function LedgerProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: ledger, isLoading } = useGetLedger(id || "", { 
    query: { enabled: !!id, queryKey: getGetLedgerQueryKey(id || "") } 
  });
  
  const updateLedger = useUpdateLedger();

  const [formData, setFormData] = useState({
    name: "",
    fifoEnabled: false,
    profile: {
      phone: "",
      upiId: "",
      bankAccount: "",
      ifsc: "",
      notes: ""
    }
  });

  useEffect(() => {
    if (ledger) {
      setFormData({
        name: ledger.name,
        fifoEnabled: ledger.fifoEnabled,
        profile: {
          phone: ledger.profile?.phone || "",
          upiId: ledger.profile?.upiId || "",
          bankAccount: ledger.profile?.bankAccount || "",
          ifsc: ledger.profile?.ifsc || "",
          notes: ledger.profile?.notes || ""
        }
      });
    }
  }, [ledger]);

  const handleSave = () => {
    updateLedger.mutate({
      ledgerId: id!,
      data: {
        name: formData.name,
        fifoEnabled: formData.fifoEnabled,
        profile: formData.profile
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLedgerQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getGetLedgersQueryKey() });
        toast({
          title: "Profile saved",
          description: "Ledger details updated successfully."
        });
        setLocation(`/ledger/${id}`);
      }
    });
  };

  const copyUpi = () => {
    if (formData.profile.upiId) {
      navigator.clipboard.writeText(formData.profile.upiId);
      toast({ title: "UPI ID Copied" });
    }
  };

  const payViaUpi = () => {
    if (formData.profile.upiId) {
      const upiUrl = `upi://pay?pa=${formData.profile.upiId}&pn=${encodeURIComponent(formData.name)}`;
      window.open(upiUrl);
    }
  };

  if (!id) return null;

  return (
    <Layout>
      <div className="bg-card border-b border-border sticky top-0 z-20 px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -ml-2" onClick={() => setLocation(`/ledger/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg leading-none">Ledger Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase tracking-wider text-xs">Party Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="pl-10 h-14 text-lg bg-background border-border"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <div>
              <Label className="text-foreground font-medium text-sm">Enable FIFO Tracking</Label>
              <p className="text-xs text-muted-foreground mt-1">Track bill-by-bill payments automatically</p>
            </div>
            <Switch 
              checked={formData.fifoEnabled}
              onCheckedChange={c => setFormData({...formData, fifoEnabled: c})}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-sm font-bold text-primary uppercase tracking-widest border-b border-border pb-2">Payment Details</h3>
          
          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase tracking-wider text-xs">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="tel"
                value={formData.profile.phone}
                onChange={e => setFormData({...formData, profile: {...formData.profile, phone: e.target.value}})}
                className="pl-10 h-14 bg-background border-border"
                placeholder="10-digit mobile number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase tracking-wider text-xs">UPI ID</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  value={formData.profile.upiId}
                  onChange={e => setFormData({...formData, profile: {...formData.profile, upiId: e.target.value}})}
                  className="pl-10 h-14 bg-background border-border"
                  placeholder="name@upi"
                />
              </div>
              {formData.profile.upiId && (
                <Button size="icon" variant="outline" className="h-14 w-14 shrink-0 border-border bg-card hover:bg-background" onClick={copyUpi}>
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}
            </div>
            {formData.profile.upiId && (
              <Button onClick={payViaUpi} className="w-full mt-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                Pay via UPI
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Bank Account</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={formData.profile.bankAccount}
                  onChange={e => setFormData({...formData, profile: {...formData.profile, bankAccount: e.target.value}})}
                  className="pl-9 bg-background border-border"
                  placeholder="A/c Number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">IFSC Code</Label>
              <Input 
                value={formData.profile.ifsc}
                onChange={e => setFormData({...formData, profile: {...formData.profile, ifsc: e.target.value}})}
                className="bg-background border-border"
                placeholder="IFSC"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground uppercase tracking-wider text-xs">Notes</Label>
          <Textarea 
            value={formData.profile.notes}
            onChange={e => setFormData({...formData, profile: {...formData.profile, notes: e.target.value}})}
            className="bg-background border-border min-h-[100px] resize-none"
            placeholder="Add any extra details here..."
          />
        </div>
      </div>

      <div className="p-4 bg-background border-t border-border sticky bottom-0">
        <Button 
          onClick={handleSave} 
          size="lg" 
          className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={updateLedger.isPending}
        >
          {updateLedger.isPending ? "Saving..." : <><Save className="w-5 h-5 mr-2" /> Save Profile</>}
        </Button>
      </div>
    </Layout>
  );
}
