import * as React from "react"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Copy } from "lucide-react"

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  /** Show a copy button that writes the current value to clipboard */
  showCopy?: boolean;
}

function PasswordInput({ className, showCopy, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  const handleCopy = async () => {
    const value = typeof props.value === "string" ? props.value : "";
    if (value) {
      await navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          showCopy ? "pr-16" : "pr-9",
          className
        )}
        {...props}
      />
      <div className="absolute right-0 top-0 h-9 flex items-center gap-0.5 pr-1">
        {showCopy && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleCopy}
            className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            title="Copiar contraseña"
          >
            <Copy size={15} />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

export { PasswordInput }
