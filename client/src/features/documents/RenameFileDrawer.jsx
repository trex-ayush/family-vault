import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button.jsx';
import Drawer from '@/components/ui/Drawer.jsx';
import Input from '@/components/ui/Input.jsx';
import { useRenameFile } from './documentsHooks.js';
import { nameWithoutExtension } from './fileNames.js';

const FILE_LABEL_MAX = 200; // same as the server

/**
 * Rename one file of a document. Starts from its current name (without ".jpg"/".pdf" — the
 * extension is kept by itself, so the file still opens anywhere). Clearing the box goes back to
 * the name it was uploaded with. Props: `documentId`, `file` (null = closed), `onClose`.
 */
export default function RenameFileDrawer({ documentId, file, onClose }) {
  const { t } = useTranslation(['documents', 'common']);
  const rename = useRenameFile(documentId);
  const [draft, setDraft] = useState(null);
  const value = draft ?? (file ? file.label || nameWithoutExtension(file.originalName) : '');

  const close = () => {
    setDraft(null);
    onClose();
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const label = value.trim();
    // Typing the uploaded name back in is the same as no name of its own.
    const same = label === nameWithoutExtension(file.originalName) || label === file.originalName;
    try {
      await rename.mutateAsync({ fileId: file.id, label: same ? '' : label });
      toast.success(t('fileGallery.toasts.renamed', 'File renamed'));
      close();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('fileGallery.toasts.renameFailed', 'Could not rename the file'));
    }
  };

  return (
    <Drawer
      isOpen={Boolean(file)}
      onClose={close}
      side="right"
      size="sm"
      title={t('fileGallery.renameTitle', 'Rename file')}
      description={t('fileGallery.renameHint', 'The file keeps its type (like .jpg or .pdf), so it still opens anywhere.')}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={rename.isPending}>
            {t('common:actions.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} loading={rename.isPending}>
            {t('common:actions.save', 'Save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave}>
        <Input
          label={t('fileGallery.renameLabel', 'File name')}
          value={value}
          maxLength={FILE_LABEL_MAX}
          autoFocus
          enterKeyHint="done"
          placeholder={file ? nameWithoutExtension(file.originalName) : ''}
          help={file && file.label ? t('fileGallery.renameReset', 'Leave it empty to use “{{name}}” again.', { name: file.originalName }) : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </form>
    </Drawer>
  );
}
