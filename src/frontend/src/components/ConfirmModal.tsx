import { getLang, t } from "../i18n";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}

export default function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  message,
}: Props) {
  const lang = getLang();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-[#0f1729] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{t(lang, "areYouSure")}</DialogTitle>
        </DialogHeader>
        <p className="text-slate-300 text-sm">
          {message ?? t(lang, "thisActionCannotBeUndone")}
        </p>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            data-ocid="confirm.cancel_button"
            className="border-white/20 text-white hover:bg-white/10"
          >
            {t(lang, "cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            data-ocid="confirm.confirm_button"
            className="bg-red-600 hover:bg-red-700"
          >
            {t(lang, "confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
