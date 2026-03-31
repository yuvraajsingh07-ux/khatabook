import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { 
  useGetLedgers,
  useCreateEntry,
  useGetPastRemarks,
  getGetEntriesQueryKey,
  getGetLedgerQueryKey,
  getGetLedgerSummaryQueryKey,
  getGetOverviewQueryKey,
  getGetFifoStatusQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateEntryInputType } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function AddEntry() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Extract type from URL params (cash-in, bill-out, transfer)
  const queryParams = new URLSearchParams(window.location.search);
  const initialType = (queryParams.get("type") as CreateEntryInputType) || "credit";

  const { data: ledgers } = useGetLedgers();
  const { data: pastRemarks } = useGetPastRemarks(id || "", { 
    query: { enabled: !!id, queryKey: ["pastRemarks", id] } 
  });

  const createEntry = useCreateEntry();

  const [type, setType] = useState<CreateEntryInputType>(initialType);
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferToId, setTransferToId] = useState("");
  
  const [showRemarks, setShowRemarks] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (type === "transfer" && !transferToId) return;

    createEntry.mutate({
      ledgerId: id!,
      data: {
        type,
        amount: Number(amount),
        remark,
        date: new Date(date).toISOString(),
        ...(type === "transfer" ? { transferToLedgerId: transferToId } : {})
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEntriesQueryKey(id!, {}) });
        queryClient.invalidateQueries({ queryKey: getGetLedgerQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getGetLedgerSummaryQueryKey(id!, {}) });
        queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFifoStatusQueryKey(id!) });
        
        if (type === "transfer" && transferToId) {
          queryClient.invalidateQueries({ queryKey: getGetEntriesQueryKey(transferToId, {}) });
          queryClient.invalidateQueries({ queryKey: getGetLedgerQueryKey(transferToId) });
        }
        
        setLocation(`/ledger/${id}`);
      }
    });
  };

  if (!id) return null;

  return (
    <Layout>
      <div className="bg-card border-b border-border sticky top-0 z-20 px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -ml-2" onClick={() => setLocation(`/ledger/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg leading-none">New Entry</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          
          {/* Type Selector */}
          <div className="flex p-1 bg-background border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors rounded-lg ${type === 'credit' ? 'bg-green-500 text-white shadow-md' : 'text-muted-foreground hover:bg-card'}`}
              onClick={() => setType('credit')}
            >
              Cash In
            </button>
            <button
              type="button"
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors rounded-lg ${type === 'debit' ? 'bg-destructive text-white shadow-md' : 'text-muted-foreground hover:bg-card'}`}
              onClick={() => setType('debit')}
            >
              Bill Out
            </button>
            <button
              type="button"
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors rounded-lg ${type === 'transfer' ? 'bg-blue-500 text-white shadow-md' : 'text-muted-foreground hover:bg-card'}`}
              onClick={() => setType('transfer')}
            >
              Transfer
            </button>
          </div>

          <div className="space-y-8">
            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Amount</Label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono ${
                  type === 'credit' ? 'text-green-500' : type === 'debit' ? 'text-destructive' : 'text-blue-500'
                }`}>₹</span>
                <Input 
                  type="tel"
                  autoFocus
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`pl-10 h-20 text-4xl font-mono font-bold bg-background border-border ${
                    type === 'credit' ? 'focus-visible:ring-green-500/50 text-green-500' : 
                    type === 'debit' ? 'focus-visible:ring-destructive/50 text-destructive' : 
                    'focus-visible:ring-blue-500/50 text-blue-500'
                  }`}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input 
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="pl-10 h-14 bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Remark */}
            <div className="space-y-2 relative">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Remark / Details</Label>
              <Input 
                value={remark}
                onChange={e => setRemark(e.target.value)}
                onFocus={() => setShowRemarks(true)}
                onBlur={() => setTimeout(() => setShowRemarks(false), 200)}
                className="h-14 bg-background border-border text-base"
                placeholder="What was this for?"
              />
              
              {/* Autocomplete Dropdown */}
              {showRemarks && pastRemarks && pastRemarks.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {pastRemarks.filter(r => r.toLowerCase().includes(remark.toLowerCase())).map((r, i) => (
                    <div 
                      key={i} 
                      className="px-4 py-3 border-b border-border/50 hover:bg-background cursor-pointer text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        setRemark(r);
                        setShowRemarks(false);
                      }}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer To */}
            {type === 'transfer' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                <Label className="text-muted-foreground uppercase tracking-wider text-xs">Transfer To Ledger</Label>
                <Select value={transferToId} onValueChange={setTransferToId}>
                  <SelectTrigger className="h-14 bg-background border-border text-base">
                    <SelectValue placeholder="Select a ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgers?.filter(l => l.id !== id).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-background border-t border-border sticky bottom-0">
          <Button 
            type="submit"
            size="lg" 
            disabled={!amount || Number(amount) <= 0 || (type === 'transfer' && !transferToId) || createEntry.isPending}
            className={`w-full h-14 text-lg font-bold text-white transition-colors ${
              type === 'credit' ? 'bg-green-500 hover:bg-green-600' : 
              type === 'debit' ? 'bg-destructive hover:bg-destructive/90' : 
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {createEntry.isPending ? "Saving..." : <><Check className="w-6 h-6 mr-2" /> Save Entry</>}
          </Button>
        </div>
      </form>
    </Layout>
  );
}
