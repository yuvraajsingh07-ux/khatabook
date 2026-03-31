import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { 
  useGetLedger,
  useGetEntries,
  useGetLedgerSummary,
  useGetFifoStatus,
  useDeleteEntry,
  getGetLedgerQueryKey,
  getGetEntriesQueryKey,
  getGetLedgerSummaryQueryKey,
  getGetOverviewQueryKey,
  getGetFifoStatusQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { formatCurrency, formatBalance, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Plus, User, Info, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, FileEdit, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function LedgerDetail() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: ledger, isLoading: loadingLedger } = useGetLedger(id || "", { 
    query: { enabled: !!id, queryKey: getGetLedgerQueryKey(id || "") } 
  });
  
  const { data: entries, isLoading: loadingEntries } = useGetEntries(id || "", {}, {
    query: { enabled: !!id, queryKey: getGetEntriesQueryKey(id || "", {}) }
  });
  
  const { data: summary } = useGetLedgerSummary(id || "", {}, {
    query: { enabled: !!id, queryKey: getGetLedgerSummaryQueryKey(id || "", {}) }
  });
  
  const { data: fifoStatus } = useGetFifoStatus(id || "", {
    query: { enabled: !!id && !!ledger?.fifoEnabled, queryKey: getGetFifoStatusQueryKey(id || "") }
  });

  const deleteEntry = useDeleteEntry();

  const [fabExpanded, setFabExpanded] = useState(false);

  const handleDeleteEntry = (entryId: string) => {
    if (confirm("Delete this entry?")) {
      deleteEntry.mutate({ ledgerId: id!, entryId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEntriesQueryKey(id!, {}) });
          queryClient.invalidateQueries({ queryKey: getGetLedgerQueryKey(id!) });
          queryClient.invalidateQueries({ queryKey: getGetLedgerSummaryQueryKey(id!, {}) });
          queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
          if (ledger?.fifoEnabled) {
             queryClient.invalidateQueries({ queryKey: getGetFifoStatusQueryKey(id!) });
          }
        }
      });
    }
  };

  // Group entries by date
  const groupedEntries = entries?.reduce((acc: Record<string, typeof entries>, entry) => {
    const date = new Date(entry.date).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {}) || {};

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (!id) return null;

  return (
    <Layout>
      {/* Top Bar */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -ml-2 hover:bg-background" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {loadingLedger ? (
              <Skeleton className="h-6 w-32 bg-background" />
            ) : (
              <div 
                className="cursor-pointer"
                onClick={() => setLocation(`/ledger/${id}/profile`)}
              >
                <h2 className="font-bold text-lg leading-none truncate max-w-[200px]">{ledger?.name}</h2>
                <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider flex items-center gap-1">
                  View Profile <ArrowRightLeft className="w-3 h-3 inline opacity-50" />
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            {loadingLedger ? (
              <Skeleton className="h-6 w-24 bg-background ml-auto" />
            ) : (
              <>
                <div className={`font-mono font-bold text-lg ${ledger!.balance > 0 ? 'text-green-500' : ledger!.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatCurrency(Math.abs(ledger!.balance))}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                  {ledger!.balance > 0 ? "You'll Get" : ledger!.balance < 0 ? "You'll Give" : "Settled"}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Sticky Summary Strip */}
        <div className="grid grid-cols-2 bg-background/50 border-t border-border text-xs uppercase tracking-wider font-medium">
          <div className="p-2.5 text-center border-r border-border text-destructive">
            Gave <span className="font-mono ml-1">{summary ? formatCurrency(summary.totalDebit) : "---"}</span>
          </div>
          <div className="p-2.5 text-center text-green-500">
            Got <span className="font-mono ml-1">{summary ? formatCurrency(summary.totalCredit) : "---"}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* FIFO Status Card */}
        {ledger?.fifoEnabled && fifoStatus?.oldestUnpaidBill && (
          <div className="mx-4 mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
              FIFO Active
            </div>
            <h4 className="text-amber-500 font-medium text-sm mb-1">Oldest Unpaid Bill</h4>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-amber-500/80 text-xs mb-1">
                  {formatDate(fifoStatus.oldestUnpaidBill.date)} • {fifoStatus.oldestUnpaidBill.remark}
                </p>
                <div className="text-lg font-mono font-bold text-amber-500">
                  {formatCurrency(fifoStatus.oldestUnpaidBill.remainingAmount)} <span className="text-xs font-sans font-medium text-amber-500/60 ml-1">remaining</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entries List */}
        <div className="p-4 space-y-6">
          {loadingEntries ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-xl bg-card border border-border" />
              ))}
            </div>
          ) : entries?.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Info className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Entries</h3>
              <p className="text-muted-foreground text-sm">Tap the + button to add an entry.</p>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="space-y-3">
                <div className="flex items-center justify-center relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                  <div className="relative bg-background px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {formatDate(date)}
                  </div>
                </div>
                
                {groupedEntries[date].map(entry => (
                  <div key={entry.id} className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start shadow-sm relative group">
                    {/* Icon by type */}
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                      ${entry.type === 'credit' ? 'bg-green-500/20 text-green-500' : 
                        entry.type === 'debit' ? 'bg-destructive/20 text-destructive' : 
                        'bg-blue-500/20 text-blue-500'}`}>
                      {entry.type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : 
                       entry.type === 'debit' ? <ArrowUpRight className="w-4 h-4" /> : 
                       <ArrowRightLeft className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-foreground text-sm font-medium leading-tight break-words pr-2">
                          {entry.remark || (entry.type === 'transfer' ? `Transfer to ${entry.transferToLedgerName}` : 'No remark')}
                        </p>
                        <div className={`font-mono font-bold shrink-0 ${
                          entry.type === 'credit' ? 'text-green-500' : 
                          entry.type === 'debit' ? 'text-destructive' : 
                          'text-blue-500'
                        }`}>
                          {formatCurrency(entry.amount)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground tracking-wider uppercase">
                            {entry.type === 'credit' ? 'Payment' : entry.type === 'debit' ? 'Bill' : 'Transfer'}
                          </span>
                          
                          {/* FIFO Badge for Debit Entries */}
                          {ledger?.fifoEnabled && entry.type === 'debit' && entry.fifoRemaining !== undefined && (
                            entry.fifoRemaining === 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                ₹{entry.fifoRemaining} left
                              </span>
                            )
                          )}
                        </div>
                        
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Bal: {formatBalance(entry.balance)}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-1 h-6 w-6 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity rounded-full hover:bg-background">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteEntry(entry.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Expandable FAB */}
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-6 flex flex-col-reverse items-end gap-3 z-50">
        <Button 
          size="lg" 
          onClick={() => setFabExpanded(!fabExpanded)}
          className={`rounded-full h-14 w-14 shadow-xl p-0 flex items-center justify-center transition-all duration-300 ${
            fabExpanded ? 'bg-card text-foreground border border-border rotate-45' : 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 hover:scale-105'
          }`}
        >
          <Plus className="w-6 h-6" />
        </Button>
        
        <div className={`flex flex-col gap-3 transition-all duration-300 origin-bottom ${
          fabExpanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8 pointer-events-none'
        }`}>
          <div className="flex items-center gap-3 justify-end" onClick={() => { setFabExpanded(false); setLocation(`/ledger/${id}/add?type=transfer`); }}>
            <span className="bg-card text-foreground text-xs font-bold px-3 py-1.5 rounded-md shadow-lg border border-border uppercase tracking-wider">Transfer</span>
            <Button size="icon" className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 text-white">
              <ArrowRightLeft className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3 justify-end" onClick={() => { setFabExpanded(false); setLocation(`/ledger/${id}/add?type=debit`); }}>
            <span className="bg-card text-foreground text-xs font-bold px-3 py-1.5 rounded-md shadow-lg border border-border uppercase tracking-wider">Bill Out</span>
            <Button size="icon" className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 text-white">
              <ArrowUpRight className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3 justify-end" onClick={() => { setFabExpanded(false); setLocation(`/ledger/${id}/add?type=credit`); }}>
            <span className="bg-card text-foreground text-xs font-bold px-3 py-1.5 rounded-md shadow-lg border border-border uppercase tracking-wider">Cash In</span>
            <Button size="icon" className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 text-white">
              <ArrowDownLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay for FAB */}
      {fabExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setFabExpanded(false)}
        />
      )}
    </Layout>
  );
}
