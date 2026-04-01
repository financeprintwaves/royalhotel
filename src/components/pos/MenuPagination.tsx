import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MenuPaginationProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function MenuPagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: MenuPaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        PRIOR
      </Button>

      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={currentPage === totalPages}
      >
        NEXT
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
