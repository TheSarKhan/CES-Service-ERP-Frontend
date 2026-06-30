import { Construction } from 'lucide-react';
import { Empty } from '@/components/ui/empty';

interface ModulePlaceholderProps {
  title: string;
  description?: string;
}

/**
 * Shared "coming soon" placeholder used by module route stubs until each module
 * is implemented. Server component (no client hooks). Uses the kit `.empty`.
 */
export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <Empty
        title="Tezliklə"
        description="Bu modul hazırlanır və tezliklə əlçatan olacaq."
        icon={<Construction className="mx-auto h-12 w-12" />}
      />
    </div>
  );
}
