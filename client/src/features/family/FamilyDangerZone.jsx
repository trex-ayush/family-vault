import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { LogOut, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Drawer from '@/components/ui/Drawer.jsx';
import Input from '@/components/ui/Input.jsx';
import ConfirmDrawer from '@/components/ui/ConfirmDrawer.jsx';
import { SectionCard } from '@/components/ui/Card.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { familyApi } from '@/services/familyApi.js';

/** Same rule as the server: case and extra spaces don't matter. */
const sameName = (a, b) => String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Settings → Family, owner only: delete the whole family. A warning lists what goes, and Delete
 * only works after typing the family's name. Nothing is erased straight away — the family
 * disappears for everyone and an app admin can still bring it back (docs/DECISIONS.md).
 */
export function DeleteFamilySection() {
  const { t } = useTranslation('settings');
  const { activeFamily, activeFamilyId, dropFamily } = useAuth();
  const familyName = activeFamily?.familyName || activeFamily?.name || '';
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = sameName(typed, familyName);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
  };

  const handleDelete = async (e) => {
    e?.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    try {
      await familyApi.remove(typed);
      toast.success(t('danger.deleted', '“{{name}}” was deleted', { name: familyName }));
      dropFamily(activeFamilyId);
    } catch (err) {
      setBusy(false);
      toast.error(err?.response?.data?.message || t('danger.deleteFailed', 'Could not delete the family'));
    }
  };

  return (
    <SectionCard
      id="settings-delete-family"
      title={t('danger.deleteTitle', 'Delete this family')}
      description={t('danger.deleteDescription', 'Removes the family for every member. Only you, the owner, can do this.')}
    >
      <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={() => setOpen(true)}>
        {t('danger.deleteButton', 'Delete family')}
      </Button>

      <Drawer
        isOpen={open}
        onClose={close}
        side="right"
        size="sm"
        title={t('danger.deleteConfirmTitle', 'Delete “{{name}}”?', { name: familyName })}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              {t('common:actions.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={!matches} loading={busy}>
              {t('danger.deleteButton', 'Delete family')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-medium">{t('danger.deleteWarningTitle', 'This removes the whole family:')}</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>{t('danger.deleteWarning1', 'Every member loses access straight away.')}</li>
              <li>{t('danger.deleteWarning2', 'All its documents, files, passwords and notes go with it.')}</li>
              <li>{t('danger.deleteWarning3', 'Its share links stop working.')}</li>
            </ul>
            <p className="mt-2">{t('danger.deleteWarningUndo', 'If you change your mind, ask the app admin quickly — they can bring it back.')}</p>
          </div>
          <Input
            label={t('danger.typeName', 'To confirm, type the family name: {{name}}', { name: familyName })}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={familyName}
            disabled={busy}
          />
        </form>
      </Drawer>
    </SectionCard>
  );
}

/**
 * Settings → My account, every member except the owner: leave the family. Only their access goes;
 * what they added stays. They stay signed in and move to their next family (or "create a family").
 */
export function LeaveFamilySection() {
  const { t } = useTranslation('settings');
  const { activeFamily, activeFamilyId, dropFamily } = useAuth();
  const familyName = activeFamily?.familyName || activeFamily?.name || '';
  const [open, setOpen] = useState(false);

  const handleLeave = async () => {
    try {
      await familyApi.leave();
      toast.success(t('danger.left', 'You left “{{name}}”', { name: familyName }));
      dropFamily(activeFamilyId);
    } catch (err) {
      toast.error(err?.response?.data?.message || t('danger.leaveFailed', 'Could not leave the family'));
    }
  };

  return (
    <SectionCard
      id="settings-leave-family"
      title={t('danger.leaveTitle', 'Leave this family')}
      description={t('danger.leaveDescription', 'You stop seeing “{{name}}”. Everything you added stays with the family.', { name: familyName })}
    >
      <Button variant="secondary" leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />} onClick={() => setOpen(true)}>
        {t('danger.leaveButton', 'Leave family')}
      </Button>
      <ConfirmDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleLeave}
        title={t('danger.leaveConfirmTitle', 'Leave “{{name}}”?', { name: familyName })}
        description={t('danger.leaveConfirmDescription', 'You won’t see its documents any more. To come back, an admin has to invite you again.')}
        confirmLabel={t('danger.leaveButton', 'Leave family')}
      />
    </SectionCard>
  );
}
