import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-none border-0 shadow-2xl p-0 overflow-hidden">
        <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-destructive">
          <div className="bg-destructive/20 p-3 rounded-full mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-black">{title}</DialogTitle>
        </div>
        <div className="p-6 pt-2">
          <DialogDescription className="text-center text-muted-foreground font-medium">
            {description}
          </DialogDescription>
          <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-none font-bold h-11 border-border"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex-1 rounded-none font-bold h-11 shadow-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {confirmText}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
