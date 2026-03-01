
## Remove QZ Tray and Streamline the POS for Speed

### What Changes
Remove the QZ Tray dependency entirely (saves ~200KB bundle size) and simplify the print pipeline to use only the local HTTP daemon. Also clean up unused files.

### Files to Modify

#### 1. Remove `qz-tray` from `package.json`
- Delete the `"qz-tray": "^2.2.5"` dependency line

#### 2. Rewrite `src/services/printerService.ts`
- Remove all QZ Tray code (loadQZ, connectPrinter, qz.websocket, qz.configs, qz.print)
- Keep: `fetchPrinterSettings`, `clearPrinterCache`, `printKOT`, `printInvoice`
- Change `silentPrint()` to use the local daemon directly (POST to `localhost:3001/print`)
- No more dynamic imports, no websocket connections -- just a simple HTTP POST

#### 3. Simplify `src/services/printService.ts`
- Remove all QZ Tray references and the import from printerService
- Remove `connectPrinter` usage
- `PrintMethod` type becomes `'daemon' | 'none'` (drop `'qz'`)
- `getPrintStatus()` only checks daemon health
- `silentPrintHTML()` only tries daemon -- one path, no cascading

#### 4. Update `src/components/ReceiptDialog.tsx`
- Remove the `'qz'` entry from `STATUS_COLORS` map
- Only show daemon/none status indicator

#### 5. Update `src/pages/PrinterSettings.tsx`
- Remove `connectPrinter` import
- Change test print to use the daemon endpoint directly (POST to `localhost:3001/print`) instead of QZ Tray
- Update error messages to reference "local print daemon" instead of "QZ Tray"

#### 6. Delete `src/App.css`
- Not imported anywhere -- dead file taking up space

### Result
- **Bundle size reduction**: ~200KB smaller (qz-tray removed)
- **Faster startup**: No QZ Tray websocket connection attempts on load
- **Simpler code**: One print path (daemon) instead of cascading fallback
- **Fewer network calls**: No more QZ Tray connection probes timing out
