import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileText, Folder, FolderOpen, Share2 } from 'lucide-react';
import PageContainer from '@/components/ui/PageContainer.jsx';
import PageHeader from '@/components/ui/PageHeader.jsx';
import Button from '@/components/ui/Button.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import ConfirmDrawer from '@/components/ui/ConfirmDrawer.jsx';
import Drawer from '@/components/ui/Drawer.jsx';
import { openShareDialog } from '@/features/share/shareDialogHost.jsx';
import FilterBar from '@/components/ui/FilterBar.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { pageSlice } from '@/components/ui/pagination.js';
import { ListCard, ListIcon, ListRow } from '@/components/ui/ListRow.jsx';
import { ErrorState } from '@/components/ui/PageState.jsx';
import { SkeletonRows } from '@/components/ui/Skeleton.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { sharesApi } from '@/services/sharesApi.js';
import { durationLabel, shareStatusOf, formatExpiry, formatTimeRemaining } from '@/features/share/shareStatus.js';
import { useFolderTree } from '@/features/folders/foldersHooks.js';
import { folderName } from '@/features/folders/folderTreeUtils.js';
import RequireWrite from '@/features/members/RequireWrite.jsx';
import Tooltip from '@/components/ui/Tooltip.jsx';

const PAGE_SIZE = 20;

/**
 * Shares page (`/shares`) — every link the family has made: what it shares, when it expires,
 * how many times it was opened, and buttons to revoke it or turn it back on. Tapping a row offers
 * "Share link" (the same link again) and "Open" (what it shares). Links are made with the Share button on a
 * folder, document or file (features/share/ShareButton.jsx), never here. `GET /shares` returns
 * every link at once, so search, the Active / All switch and the pages are all worked out here.
 */
export default function Shares() {
  return (
    <RequireWrite>
      <SharesPage />
    </RequireWrite>
  );
}

function SharesPage() {
  const { t } = useTranslation(['shares', 'common']);
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const isAdmin = membership?.role === 'admin';
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [revokeShare, setRevokeShare] = useState(null);
  const [removeShare, setRemoveShare] = useState(null);
  const [reactivateShare, setReactivateShare] = useState(null);
  const [chosen, setChosen] = useState(null); // { share, label }

  const { data, isLoading, isError } = useQuery({ queryKey: ['shares'], queryFn: () => sharesApi.list() });

  const shares = useMemo(() => {
    const all = data?.items || [];
    const needle = q.trim().toLowerCase();
    return all.filter(
      (s) =>
        (filter !== 'active' || shareStatusOf(s) === 'active') &&
        (!needle || (s.targetLabel || '').toLowerCase().includes(needle)),
    );
  }, [data, filter, q]);
  useEffect(() => setPage(1), [filter, q]);
  const searching = q.trim() !== '';

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shares'] });

  const handleRevoke = async () => {
    try {
      await sharesApi.revoke(revokeShare.id);
      toast.success(t('toasts.revoked', 'Link turned off'));
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('toasts.revokeFailed', 'Could not turn off this link.'));
    }
  };

  const handleReactivate = async () => {
    try {
      await sharesApi.reactivate(reactivateShare.id);
      toast.success(t('toasts.reactivated', 'Link is on again'));
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('toasts.reactivateFailed', 'Could not turn this link back on.'));
    }
  };

  const handleRemove = async () => {
    try {
      await sharesApi.remove(removeShare.id);
      toast.success(t('toasts.removed', 'Removed from the list'));
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('toasts.removeFailed', 'Could not remove this link.'));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('page.title', 'Shares')}
        subtitle={t('page.subtitle', 'Links you have sent. Anyone with a link can see its files until it expires.')}
      />

      <FilterBar
        className="mb-4 sm:mb-6"
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t('page.searchPlaceholder', 'Search by name')}
        values={{ filter }}
        onChange={(next) => setFilter(next.filter)}
        filters={[
          {
            key: 'filter',
            label: t('page.showLabel', 'Show'),
            type: 'segment',
            empty: 'active',
            options: [
              { value: 'active', label: t('page.filterActive', 'Active'), tip: t('tip.filterActive', 'Only links that still work') },
              { value: 'all', label: t('page.filterAll', 'All'), tip: t('tip.filterAll', 'Also old and stopped links') },
            ],
          },
        ]}
      />

      {isLoading ? (
        <SkeletonRows count={5} action />
      ) : isError ? (
        <ErrorState>{t('page.loadError', 'Could not load shares.')}</ErrorState>
      ) : shares.length === 0 ? (
        <EmptyState
          icon={<Share2 strokeWidth={1.5} />}
          title={
            searching
              ? t('page.noMatchTitle', 'No links match that')
              : filter === 'active'
                ? t('page.emptyActiveTitle', 'No active links')
                : t('page.emptyTitle', 'No links yet')
          }
          description={
            searching
              ? t('page.noMatchDescription', 'Check the spelling or try a shorter word.')
              : t('page.emptyDescription', 'Open a folder or document and tap Share to send it to someone.')
          }
        />
      ) : (
        <>
          <ListCard columns>
            {pageSlice(shares, page, PAGE_SIZE).map((s) => (
              <ShareRow key={s.id} share={s} isAdmin={isAdmin} onChoose={(share, label) => setChosen({ share, label })} onRevoke={setRevokeShare} onReactivate={setReactivateShare} onRemove={setRemoveShare} />
            ))}
          </ListCard>
          <Pagination page={page} pageSize={PAGE_SIZE} total={shares.length} onPageChange={setPage} />
        </>
      )}

      <ShareChoices chosen={chosen} onClose={() => setChosen(null)} />

      <ConfirmDrawer
        isOpen={!!revokeShare}
        onClose={() => setRevokeShare(null)}
        onConfirm={handleRevoke}
        title={t('revokeModal.title', 'Turn off this link?')}
        description={t('revokeModal.description', 'Anyone who has the link will not be able to open it any more. You can turn it back on later: choose All on this page.')}
        confirmLabel={t('actions.revoke', 'Revoke')}
      />

      <ConfirmDrawer
        isOpen={!!reactivateShare}
        onClose={() => setReactivateShare(null)}
        onConfirm={handleReactivate}
        title={t('reactivateModal.title', 'Turn this link on again?')}
        description={t('reactivateModal.description', 'The same link you already sent will work again for {{time}}. Anyone who has it can open the files.', { time: durationLabel(reactivateShare?.duration, t) })}
        confirmLabel={t('actions.reactivate', 'Turn on again')}
        confirmVariant="primary"
        hideIcon
      />

      <ConfirmDrawer
        isOpen={!!removeShare}
        onClose={() => setRemoveShare(null)}
        onConfirm={handleRemove}
        title={t('removeModal.title', 'Remove from the list?')}
        description={t('removeModal.description', 'This link already stopped working. Removing it only tidies up this list.')}
        confirmLabel={t('common:actions.remove', 'Remove')}
      />
    </PageContainer>
  );
}

/**
 * What a tapped row offers: "Share link" (the same dialog as sharing: WhatsApp / Copy) and "Open".
 * A link that can't be sent as it is (turned off, expired, or made before links were saved) leads
 * to the dialog's usual choice: another working link if there is one, else a new one. It says so;
 * any old link keeps doing what it did.
 */
function ShareChoices({ chosen, onClose }) {
  const { t } = useTranslation(['shares', 'common']);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const share = chosen?.share;
  const label = chosen?.label;
  const isFolder = share?.targetType === 'folder';
  const sendsSameLink = share && shareStatusOf(share) === 'active' && share.canShowLink;

  const handleShare = async () => {
    const target = { targetType: share.targetType, targetId: share.targetId, fileIds: share.fileIds?.length ? share.fileIds : undefined, targetLabel: label };
    setBusy(true);
    try {
      const existing = sendsSameLink ? { ...share, url: (await sharesApi.link(share.id)).url } : null;
      onClose();
      openShareDialog({ ...target, existing }, queryClient);
    } catch (err) {
      toast.error(err?.response?.data?.message || t('choice.linkFailed', 'Could not get this link. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  let shareHint = t('choice.shareHint', 'Send it on WhatsApp or copy it');
  if (share && !sendsSameLink) {
    shareHint = shareStatusOf(share) === 'active'
      ? t('choice.shareHintOld', 'This older link can’t be shown again, so this makes a new one')
      : t('choice.shareHintOff', 'This link is off, so this makes a new one');
  }

  return (
    <Drawer side="right" size="sm" isOpen={!!chosen} onClose={onClose} title={t('choice.title', 'What do you want to do?')}>
      <p className="mb-4 break-words text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
      {share && (
        <ListCard>
          <ListRow
            icon={<ListIcon icon={Share2} kind="folder" />}
            title={t('choice.share', 'Share link')}
            meta={shareHint}
            wrapMeta
            onClick={busy ? undefined : handleShare}
          />
          <ListRow
            icon={<ListIcon icon={isFolder ? FolderOpen : FileText} kind={isFolder ? 'folder' : 'document'} />}
            title={t('choice.open', 'Open')}
            meta={isFolder ? t('choice.openFolder', 'See this folder') : t('choice.openDocument', 'See this document')}
            to={`${isFolder ? '/browse' : '/documents'}/${share.targetId}`}
          />
        </ListCard>
      )}
    </Drawer>
  );
}

function ShareRow({ share, isAdmin, onChoose, onRevoke, onReactivate, onRemove }) {
  const { t } = useTranslation(['shares', 'common']);
  const status = shareStatusOf(share);
  const Icon = share.targetType === 'folder' ? Folder : FileText;
  const opens = share.openCount ?? 0;
  const typeLabel = share.targetType === 'folder' ? t('targetType.folder', 'Folder') : t('targetType.document', 'Document');
  // The Shared folder is stored as "Shared"; show it in the reader's language.
  const { data: tree } = useFolderTree({ enabled: share.targetType === 'folder' });
  const sharedFolder = share.targetType === 'folder' ? tree?.items?.find((f) => f.id === share.targetId && f.isSystem) : null;
  const label = sharedFolder ? folderName(sharedFolder, t) : share.targetLabel;
  // Tapping the row offers Share link / Open, unless what it shares is in the Bin or gone.
  const openable = !share.targetInBin && Boolean(share.targetLabel);
  // Nothing to bring back if an admin turned it off, or there's nothing left to show.
  const canTurnOn = status !== 'active' && !share.revokedByAdmin && openable;

  return (
    <ListRow
      wrapMeta
      stackActions
      onClick={openable ? () => onChoose(share, share.fileNames?.length ? `${label} – ${share.fileNames.join(', ')}` : label) : undefined}
      icon={<ListIcon icon={Icon} kind={share.targetType === 'folder' ? 'folder' : 'document'} />}
      title={label || t('page.untitled', '(no name)')}
      meta={
        <>
          <span>{typeLabel}</span>
          {/* A link to just some files: say which, so links to one document can be told apart. */}
          {share.fileNames?.length > 0 && (
            <>
              {' · '}
              <span>{share.fileNames.join(', ')}</span>
            </>
          )}
          {share.targetInBin && (
            <>
              {' · '}
              {/* The link shows "not found" while its document or folder is in the Bin. */}
              <span className="text-amber-700 dark:text-amber-400">{t('page.inBin', 'In the Bin, link paused')}</span>
            </>
          )}
          {' · '}
          <Tooltip content={status === 'active' ? formatExpiry(share) : null} className="inline">
            <span className={status === 'active' ? '' : 'text-red-600 dark:text-red-400'}>
              {share.revokedByAdmin ? t('status.revokedByAdmin', 'Turned off by the site admin') : formatTimeRemaining(share, t)}
            </span>
          </Tooltip>
          {' · '}
          <span>
            {opens === 1
              ? t('page.opened_one', 'Opened {{count}} time', { count: opens })
              : t('page.opened_other', 'Opened {{count}} times', { count: opens })}
          </span>
        </>
      }
      actions={
        status === 'active' ? (
          <Tooltip content={t('tip.revoke', 'Stop this link from working')}>
            <Button variant="secondary" size="sm" onClick={() => onRevoke(share)}>
              {t('actions.revoke', 'Revoke')}
            </Button>
          </Tooltip>
        ) : canTurnOn || isAdmin ? (
          <>
            {canTurnOn && (
              <Tooltip content={t('tip.reactivate', 'Make this same link work again')}>
                <Button variant="secondary" size="sm" onClick={() => onReactivate(share)}>
                  {t('actions.reactivate', 'Turn on again')}
                </Button>
              </Tooltip>
            )}
            {isAdmin && (
              <Tooltip content={t('tip.remove', 'Remove it from this list')}>
                <Button variant="ghost" size="sm" onClick={() => onRemove(share)}>
                  {t('common:actions.remove', 'Remove')}
                </Button>
              </Tooltip>
            )}
          </>
        ) : null
      }
    />
  );
}
