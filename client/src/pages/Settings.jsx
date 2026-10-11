import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserRound, Users } from 'lucide-react';
import PageContainer from '@/components/ui/PageContainer.jsx';
import PageHeader from '@/components/ui/PageHeader.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs.jsx';
import { SECTION_GAP } from '@/components/ui/tokens.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { familyApi } from '@/services/familyApi.js';
import SettingsProfile from './SettingsProfile.jsx';
import SettingsPassword from './SettingsPassword.jsx';
import SettingsFamily from './SettingsFamily.jsx';
import SettingsNotifications from './SettingsNotifications.jsx';
import { DeleteFamilySection, LeaveFamilySection } from '@/features/family/FamilyDangerZone.jsx';

const TWO_COLUMNS = `${SECTION_GAP} lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0`;

// Old /settings/<tab> links (from before the tabs were merged) land on the merged tab.
const TAB_FROM_PATH = {
  account: 'account',
  profile: 'account',
  password: 'account',
  theme: 'account',
  family: 'family',
  notifications: 'family',
};

/**
 * Settings page (`/settings`, `/settings/:tab`). Two tabs:
 *  - **My account** (everyone): Profile (name, avatar colour) and Password, each with its own Save;
 *    everyone but the owner can also Leave the family here.
 *  - **Family** (admins only): family name + default share-link duration, then the alert emails;
 *    the owner can Delete the family at the bottom.
 * With only one tab to show (non-admins) there's no tab bar, just the content. Theme and
 * language live in the navbar's profile menu and the phone's More menu. Deployment-wide limits
 * and the sign-in policy are on the platform owner's `/platform-settings` page, not here.
 */
export default function Settings() {
  const { t } = useTranslation('settings');
  const { membership } = useAuth();
  const isAdmin = membership?.role === 'admin';
  const isOwner = Boolean(membership?.isOwner);
  const params = useParams();
  const navigate = useNavigate();

  const requested = TAB_FROM_PATH[(params['*'] || '').split('/')[0]] || 'account';
  const tab = requested === 'family' && !isAdmin ? 'account' : requested;
  const setTab = (next) => navigate(`/settings/${next}`, { replace: true });

  const { data: family } = useQuery({ queryKey: ['family'], queryFn: () => familyApi.get(), enabled: isAdmin });

  // Two sections side by side from lg (Profile | Password, Family | Alerts); stacked on phones.
  // Leave / Delete: on PC under the short card on the left, so they're seen without scrolling past
  // the long card on the right; on phones (one column) last on the page, where a danger action goes.
  const leave = membership && !isOwner;
  const account = (
    <div className={TWO_COLUMNS}>
      <div className={SECTION_GAP}>
        <SettingsProfile />
        {leave && <div className="hidden lg:block"><LeaveFamilySection /></div>}
      </div>
      <SettingsPassword />
      {leave && <div className="lg:hidden"><LeaveFamilySection /></div>}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader title={t('pageTitle', 'Settings')} />
      {isAdmin ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="account" icon={UserRound} tip={t('tip.tabAccount', 'Your name, colour and password')}>
              {t('tabs.account', 'My account')}
            </TabsTrigger>
            <TabsTrigger value="family" icon={Users} tip={t('tip.tabFamily', 'Family name, links and emails')}>
              {t('tabs.family', 'Family')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account">{account}</TabsContent>
          <TabsContent value="family">
            <div className={TWO_COLUMNS}>
              <div className={SECTION_GAP}>
                <SettingsFamily family={family} />
                {isOwner && <div className="hidden lg:block"><DeleteFamilySection /></div>}
              </div>
              <SettingsNotifications family={family} />
              {isOwner && <div className="lg:hidden"><DeleteFamilySection /></div>}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        account
      )}
    </PageContainer>
  );
}
