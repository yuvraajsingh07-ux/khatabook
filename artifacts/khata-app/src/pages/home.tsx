import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetLedgers, 
  useGetOverview, 
  useCreateLedger,
  getGetLedgersQueryKey,
  getGetOverviewQueryKey,
  useDeleteLedger
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { formatCurrency } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoreVertical, Plus, User, FileText, ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

export default function Home() {
  const { data: ledgers, isLoading: loadingLedgers } = useGetLedgers();
  const { data: overview, isLoading: loadingOverview } = useGetOverview();
  const [location, setLocation] = useLocation();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  
  const queryClient = useQueryClient();
  const createLedger = useCreateLedger();
  const deleteLedger = useDeleteLedger();

  const handleCreateLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName.trim()) return;
    
    createLedger.mutate(
      { data: { name: newLedgerName } },
      {
        onSuccess: (newLedger) => {
          queryClient.invalidateQueries({ queryKey: getGetLedgersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
          setIsAddOpen(false);
          setNewLedgerName("");
          setLocation(`/ledger/${newLedger.id}`);
        }
      }
    );
  };

  const handleDeleteLedger = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this ledger and all entries?")) {
      deleteLedger.mutate({ ledgerId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLedgersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header / Overview */}
        <div className="px-5 pt-8 pb-6 bg-card border-b border-border sticky top-0 z-10">
          <h1 className="text-2xl font-bold font-mono text-primary mb-6 tracking-tight">KHATA</h1>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">You'll Give</div>
              <div className="text-lg font-mono font-bold text-destructive">
                {overview ? formatCurrency(overview.ledgersIOweThem) : "---"}
              </div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">You'll Get</div>
              <div className="text-lg font-mono font-bold text-green-500">
                {overview ? formatCurrency(overview.ledgersOwingMe) : "---"}
              </div>
            </div>
          </div>
        </div>

        {/* Ledger List */}
        <div className="px-3 py-4 space-y-3">
          {loadingLedgers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-card animate-pulse rounded-xl border border-border" />
              ))}
            </div>
          ) : ledgers?.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Ledgers Yet</h3>
              <p className="text-muted-foreground text-sm">Create your first ledger to start tracking payments.</p>
            </div>
          ) : (
            ledgers?.map(ledger => (
              <div 
                key={ledger.id}
                onClick={() => setLocation(`/ledger/${ledger.id}`)}
                className="bg-card hover:bg-card/80 active:scale-[0.99] transition-all border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-mono shrink-0">
                    {ledger.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">
                      {ledger.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ledger.entryCount} entries</span>
                      {ledger.fifoEnabled && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 tracking-wider">FIFO</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={`font-mono font-bold text-base ${ledger.balance > 0 ? 'text-green-500' : ledger.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {formatCurrency(Math.abs(ledger.balance))}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                      {ledger.balance > 0 ? "You'll Get" : ledger.balance < 0 ? "You'll Give" : "Settled"}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0 rounded-full hover:bg-background">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/ledger/${ledger.id}/profile`); }}>
                        <User className="w-4 h-4 mr-2" /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={(e) => handleDeleteLedger(ledger.id, e)}>
                        Delete Ledger
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB - Create Ledger */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetTrigger asChild>
          <Button 
            size="lg" 
            className="fixed bottom-6 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-6 rounded-full h-14 w-14 shadow-xl shadow-primary/20 p-0 flex items-center justify-center bg-primary hover:bg-primary/90 hover:scale-105 transition-all z-50"
          >
            <Plus className="w-6 h-6 text-primary-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[40vh] sm:max-w-md sm:mx-auto border-t-border bg-card rounded-t-3xl pb-8">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl font-bold">New Ledger</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateLedger} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground uppercase tracking-wider text-xs">Party Name</Label>
              <Input
                id="name"
                autoFocus
                value={newLedgerName}
                onChange={(e) => setNewLedgerName(e.target.value)}
                placeholder="e.g. Ramesh Traders"
                className="h-14 text-lg bg-background border-border focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!newLedgerName.trim()}>
              Create Ledger
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
