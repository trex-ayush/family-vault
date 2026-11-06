import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/ui/Card.jsx';
import ChoiceGroup from '@/components/ui/ChoiceGroup.jsx';
import { SkeletonFields } from '@/components/ui/Skeleton.jsx';
import { FIELD_GAP } from '@/components/ui/tokens.js';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import { familyApi } from '@/services/familyApi.js';
import { SHARE_DURATIONS, durationLabel, durationTip, familyShareDuration } from '@/features/share/shareStatus.js';

/**
 * Settings > Family tab > family details section — admin only. `PATCH /family` { name, defaultShareDuration }.
 * The default duration is what the Share dialog uses (saved as soon as it is chosen); anyone
 * sharing can still pick another option for a single link.
 */
export default function SettingsFamily({ family }) {
  const { t } = useTranslation(['settings', 'shares', 'common']);
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(familyShareDuration(null));
  const [saving, setSaving] = useState(false);

  // Separate, so saving the link time never wipes a name being typed.
  const savedName = family?.name || '';
  const savedDuration = familyShareDuration(family);
  useEffect(() => setName(savedName), [savedName]);
  useEffect(() => setDuration(savedDuration), [savedDuration]);

  // Tapping a time saves it straight away: nothing else on this card suggests it needs Save.
  const handleDurationChange = async (next) => {
    setDuration(next);
    try {
      await familyApi.update({ defaultShareDuration: next });
      toast.success(t('family.durationSaved', 'New links now work for {{time}}', { time: durationLabel(next, t) }));
      queryClient.invalidateQueries({ queryKey: ['family'] });
    } catch (err) {
      setDuration(savedDuration);
      toast.error(err?.response?.data?.message || t('family.saveFailed', 'Could not save family settings.'));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('family.familyNameRequired', 'Family name is required'));
      return;
    }
    setSaving(true);
    try {
      await familyApi.update({ name: name.trim() });
      toast.success(t('family.saved', 'Family settings saved'));
      queryClient.invalidateQueries({ queryKey: ['family'] });
    } catch (err) {
      toast.error(err?.response?.data?.message || t('family.saveFailed', 'Could not save family settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (!family) return <SkeletonFields count={2} />;

  return (
    <SectionCard id="settings-family" title={t('tabs.family', 'Family')} bodyClassName={FIELD_GAP}>
      {/* Save belongs to the name: the link time below saves as soon as it is tapped. */}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input label={t('family.familyNameLabel', 'Family name')} value={name} maxLength={150} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={handleSave} loading={saving} disabled={name.trim() === savedName}>
          {t('common:actions.save', 'Save')}
        </Button>
      </div>
      <ChoiceGroup
        name="default-share-duration"
        label={t('family.shareDurationLabel', 'Default share link duration')}
        hint={t('family.shareDurationHint', 'New share links work for this long. You can pick another time when sharing.')}
        info={t('tip.shareDurationInfo', 'How long a new link keeps working')}
        columns={3}
        value={duration}
        onChange={handleDurationChange}
        options={SHARE_DURATIONS.map((value) => ({ value, label: durationLabel(value, t), tip: durationTip(value, t) }))}
      />
    </SectionCard>
  );
}
