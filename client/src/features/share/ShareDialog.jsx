import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, Copy, File, FileText, Folder, Share2 } from 'lucide-react';
import Drawer from '@/components/ui/Drawer.jsx';
import Button from '@/components/ui/Button.jsx';
import { sharesApi } from '@/services/sharesApi.js';
import { familyApi } from '@/services/familyApi.js';
import { formatDateTime } from '@/i18n/formatters.js';
import { ListIcon } from '@/components/ui/ListRow.jsx';
import ChoiceGroup from '@/components/ui/ChoiceGroup.jsx';
import { FIELD_BORDER, FIELD_CONTROL, FIELD_HINT } from '@/components/ui/tokens.js';
import { SHARE_DURATIONS, durationLabel, durationTip, familyShareDuration } from './shareStatus.js';
import { copyText, WhatsAppIcon } from './shareLinkUtils.jsx';
import Tooltip from '@/components/ui/Tooltip.jsx';
import { Skeleton, SkeletonFields } from '@/components/ui/Skeleton.jsx';

/**
 * ShareDialog — the one share flow. If this folder, document or file already has a working link,
 * that link is shown, so one thing doesn't collect several links; its time can be changed and the
 * link stays the same. Otherwise (`POST /shares`) it shows what is being shared by name, how long
 * the link lasts (the family's default from Settings, so it isn't asked again; "Change" opens the
 * choices for this one link), "Create link", then WhatsApp / Copy link / Share. Anyone with the
 * link sees only titles and files — never notes or passwords — so there are no other options to
 * think about.
 *
 * Normally opened through `ShareButton`, not rendered directly.
 *
 * Props: isOpen, onClose, targetType ('document'|'folder'), targetId, fileIds?, targetLabel?,
 * existing? (a Share plus its `url`, already looked up — goes straight to WhatsApp / Copy)
 */
/** Does this link share exactly these files? (No file list = the whole document or folder.) */
const sameFiles = (a, b) => [...(a || [])].sort().join() === [...(b || [])].sort().join();

export default function ShareDialog({ isOpen, onClose, targetType, targetId, fileIds, targetLabel, existing = null }) {
  const { t } = useTranslation(['shares', 'common']);
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const { data: family, isLoading: familyLoading, isError: familyFailed } = useQuery({ queryKey: ['family'], queryFn: () => familyApi.get(), enabled: isOpen });
  const [duration, setDuration] = useState(null);
  const [changing, setChanging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(existing);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(!existing);
  const copyTimer = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setCreated(existing);
    setCreating(false);
    setDuration(null);
    setChanging(false);
    setCopied(false);
  }, [isOpen, targetId, existing]);

  // Already shared? Show that link rather than making a second one. Links from before links were
  // saved can't be shown again, so they don't count; if this check fails, a new link can be made.
  const fileKey = (fileIds || []).join();
  useEffect(() => {
    if (!isOpen || existing) {
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const { items } = await sharesApi.list({ targetId, status: 'active' });
        const match = items.find((s) => s.canShowLink && sameFiles(s.fileIds, fileKey ? fileKey.split(',') : []));
        if (match) {
          const { url } = await sharesApi.link(match.id);
          if (!cancelled) setCreated({ ...match, url });
        }
      } catch {
        // Nothing to show: the person can still make a link.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetId, fileKey, existing]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const selected = duration || familyShareDuration(family);
  // Without the family's default we can't name it, so show the choices instead.
  const showChoices = changing || familyFailed;
  const fileCount = fileIds?.length || 0;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCreate = async () => {
    setCreating(true);
    try {
      // Not changed: leave it out, and the server uses the family's default.
      const payload = { targetType, targetId };
      if (showChoices) payload.duration = selected;
      if (fileCount) payload.fileIds = fileIds;
      const share = await sharesApi.create(payload);
      setCreated(share);
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    } catch (err) {
      toast.error(err?.response?.data?.message || t('dialog.createError', 'Could not make the link. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  // The same link for a different time: the address doesn't change.
  const handleChangeTime = async (value) => {
    try {
      const updated = await sharesApi.extend(created.id, value);
      setCreated({ ...created, ...updated, url: created.url });
      setChanging(false);
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      toast.success(t('dialog.timeChanged', 'This link now works for {{time}}', { time: durationLabel(value, t) }));
    } catch (err) {
      toast.error(err?.response?.data?.message || t('dialog.timeChangeFailed', 'Could not change the time. Please try again.'));
    }
  };

  const label = targetLabel || created?.targetLabel || '';
  const shareMessage = label
    ? t('dialog.shareMessageNamed', '“{{label}}” from Family Vault: {{url}}', { label, url: created?.url })
    : t('dialog.shareMessage', 'From Family Vault: {{url}}', { url: created?.url });

  const handleCopy = async () => {
    const ok = await copyText(created?.url || '', inputRef.current);
    if (ok) {
      toast.success(t('dialog.copied', 'Link copied'));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    }
    else toast.error(t('dialog.copyFailed', 'Could not copy. Press and hold the link to copy it.'));
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: label || t('dialog.nativeTitle', 'Shared from Family Vault'), text: shareMessage });
    } catch {
      // closed the share sheet — nothing to do
    }
  };

  // What the recipient will get, in plain words.
  let WhatIcon = FileText;
  let whatDetail = t('dialog.whatDocument', 'All files in this document');
  if (targetType === 'folder') {
    WhatIcon = Folder;
    whatDetail = t('dialog.whatFolder', 'Everything in this folder, including folders inside it');
  } else if (fileCount) {
    WhatIcon = File;
    whatDetail = fileCount === 1
      ? t('dialog.whatFiles_one', '{{count}} file', { count: fileCount })
      : t('dialog.whatFiles_other', '{{count}} files', { count: fileCount });
  }
  let whatTitle = label;
  if (!whatTitle) whatTitle = targetType === 'folder' ? t('dialog.thisFolder', 'This folder') : t('dialog.thisDocument', 'This document');

  return (
    <Drawer
      side="right"
      isOpen={isOpen}
      onClose={onClose}
      title={created ? t('dialog.titleReady', 'Your link is ready') : t('dialog.title', 'Share')}
      size="sm"
      footer={
        created ? (
          <Button onClick={onClose}>{t('common:actions.done', 'Done')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={creating}>{t('common:actions.cancel', 'Cancel')}</Button>
            <Tooltip content={t('tip.createLink', 'Make a link anyone can open')}>
              <Button onClick={handleCreate} loading={creating} disabled={checking}>{t('dialog.create', 'Create link')}</Button>
            </Tooltip>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <ListIcon icon={WhatIcon} kind={targetType === 'folder' ? 'folder' : 'document'} />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-neutral-900 dark:text-neutral-100">{whatTitle}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{whatDetail}</p>
          </div>
        </div>

        {created ? (
          <>
            <div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={created.url || ''}
                  onFocus={(e) => e.target.select()}
                  aria-label={t('dialog.linkLabel', 'Share link')}
                  className={`${FIELD_CONTROL} ${FIELD_BORDER} pr-12`}
                />
                <Tooltip content={t('tip.copyLink', 'Copy the link')} className="absolute right-0 top-0 flex h-full">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={copied ? t('dialog.copied', 'Link copied') : t('dialog.copy', 'Copy link')}
                    className="flex h-full w-11 items-center justify-center rounded-r-lg text-neutral-500 hover:text-primary-600 dark:text-neutral-300"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-600" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </Tooltip>
              </div>
              <p className="sr-only" aria-live="polite">{copied ? t('dialog.copied', 'Link copied') : ''}</p>
              {created.expiresAt && (
                <div className="flex items-center justify-between gap-3">
                  <p className={FIELD_HINT}>
                    {t('dialog.worksUntil', 'Works until {{date}}', { date: formatDateTime(created.expiresAt) })}
                  </p>
                  {created.id && !changing && (
                    <Tooltip content={t('tip.changeTimeSameLink', 'Keep this link, for another length of time')}>
                      <Button variant="link" onClick={() => setChanging(true)}>{t('dialog.changeTime', 'Change')}</Button>
                    </Tooltip>
                  )}
                </div>
              )}
              {changing && (
                <div className="mt-3">
                  <ChoiceGroup
                    name="share-duration"
                    label={t('dialog.newTime', 'Link works for')}
                    value={created.duration}
                    onChange={handleChangeTime}
                    options={SHARE_DURATIONS.map((value) => ({ value, label: durationLabel(value, t), tip: durationTip(value, t) }))}
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Tooltip content={t('tip.whatsapp', 'Send it on WhatsApp')} className="grid grid-cols-[minmax(0,1fr)]">
                <Button
                  as="a"
                  href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="bare"
                  block
                  className="bg-[#25D366] text-white hover:bg-[#1ebe5b]"
                  leftIcon={<WhatsAppIcon className="h-4 w-4" />}
                >
                  {t('dialog.whatsapp', 'Send on WhatsApp')}
                </Button>
              </Tooltip>
              {canNativeShare && (
                <Tooltip content={t('common:tip.otherApp', 'Send it using another app')} className="grid grid-cols-[minmax(0,1fr)]">
                  <Button variant="ghost" block onClick={handleNativeShare} leftIcon={<Share2 className="h-4 w-4" />}>
                    {t('dialog.moreWays', 'Share another way')}
                  </Button>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('dialog.manageHint', 'You can turn this link off or back on any time from the Shares page.')}
            </p>
          </>
        ) : checking ? (
          <SkeletonFields count={1} />
        ) : (
          <>
            {showChoices ? (
              <ChoiceGroup
                name="share-duration"
                label={t('dialog.validFor', 'Link valid for')}
                info={t('tip.validForInfo', 'After this, the link stops working')}
                value={selected}
                onChange={setDuration}
                options={SHARE_DURATIONS.map((value) => ({ value, label: durationLabel(value, t), tip: durationTip(value, t) }))}
              />
            ) : (
              <div className="flex items-center justify-between gap-3">
                {familyLoading ? (
                  <Skeleton variant="line" width={140} />
                ) : (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {t('dialog.worksFor', 'Link works for {{time}}', { time: durationLabel(selected, t) })}
                  </p>
                )}
                <Tooltip content={t('tip.changeTime', 'Choose another time for this link')}>
                  <Button variant="link" onClick={() => setChanging(true)}>{t('dialog.changeTime', 'Change')}</Button>
                </Tooltip>
              </div>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('dialog.privacyNote', 'Anyone with the link can see and download the files. Notes and passwords are never shared.')}
            </p>
          </>
        )}
      </div>
    </Drawer>
  );
}
