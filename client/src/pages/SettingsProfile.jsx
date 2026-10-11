import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/ui/Card.jsx';
import { FIELD_GAP, FIELD_HINT } from '@/components/ui/tokens.js';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { authApi } from '@/services/authApi.js';

/**
 * Settings > My account > Profile section — `PATCH /auth/me` (name). The picture shown is exactly
 * what others see: the Google photo when the account has one, otherwise the first letter of the
 * name on an automatic colour. There is nothing to pick.
 */
export default function SettingsProfile() {
  const { t } = useTranslation('settings');
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  const dirty = name.trim() !== (user?.name || '');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('profile.nameRequired', 'Name is required'));
      return;
    }
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ name: name.trim() });
      updateUser(updated);
      toast.success(t('profile.updated', 'Profile updated'));
    } catch (err) {
      toast.error(err?.response?.data?.message || t('profile.updateFailed', 'Could not update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard id="settings-profile" title={t('tabs.profile', 'Profile')} bodyClassName={FIELD_GAP}>
      <div className="flex items-center gap-4">
        {/* The live name, so the letter changes as they type (a photo stays a photo). */}
        <Avatar user={{ name, avatarUrl: user?.avatarUrl }} size="xl" />
        <div className="flex-1">
          <Input label={t('profile.nameLabel', 'Name')} value={name} onChange={(e) => setName(e.target.value)} />
          <p className={FIELD_HINT}>
            {user?.avatarUrl
              ? t('profile.pictureGoogle', 'Your picture comes from your Google account.')
              : t('profile.pictureLetter', 'Your picture is a cartoon face picked from your name. Sign in with Google to use your own photo.')}
          </p>
        </div>
      </div>

      <div className="kb-sticky flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          {t('profile.saveChanges', 'Save changes')}
        </Button>
      </div>
    </SectionCard>
  );
}
