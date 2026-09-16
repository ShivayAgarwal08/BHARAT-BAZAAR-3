import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useRemoteData } from '../hooks/useRemoteData';
import { usePageTitle } from '../hooks/usePageTitle';
import { api } from '../services/api';
import { Badge, Button, ButtonLink, Card, Loading } from '../components/ui';
import { ErrorNotice, FormActions, FormField } from '../components/FormControls';
import type { Profile, SelectedSkill, Skill } from '../types';

type OnboardingRole = 'artisan' | 'student';
const firstFields = {
  artisan: ['fullName', 'businessName', 'craftCategory', 'city', 'state', 'address', 'languages'],
  student: ['fullName', 'college', 'course', 'studyYear', 'city', 'state', 'languages'],
};
const secondFields = {
  artisan: [
    'biography',
    'currentMonthlyRevenue',
    'currentMonthlyOrders',
    'onlinePresence',
    'businessProblems',
  ],
  student: ['biography', 'weeklyAvailabilityHours', 'expectedMonthlyRate', 'portfolioUrl'],
};
const numeric = new Set([
  'studyYear',
  'weeklyAvailabilityHours',
  'expectedMonthlyRate',
  'currentMonthlyRevenue',
  'currentMonthlyOrders',
]);
const longText = new Set(['address', 'biography', 'onlinePresence', 'businessProblems']);
const requiredFields = new Set([
  'fullName',
  'businessName',
  'craftCategory',
  'city',
  'state',
  'languages',
  'college',
  'course',
  'studyYear',
  'weeklyAvailabilityHours',
  'onlinePresence',
  'businessProblems',
]);
const maximums: Record<string, number> = {
  fullName: 120,
  businessName: 160,
  craftCategory: 100,
  city: 100,
  state: 100,
  address: 500,
  college: 180,
  course: 120,
  portfolioUrl: 1000,
};

function ProfileEditor({
  role,
  profile,
  available,
}: {
  role: OnboardingRole;
  profile: Profile;
  available: Skill[];
}) {
  const { t, i18n } = useTranslation();
  const { refreshUser } = useAuth();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(profile)) {
      if (typeof value === 'string' || typeof value === 'number') result[key] = String(value);
    }
    result.languages = profile.languages.join(', ');
    return result;
  });
  const [selected, setSelected] = useState<SelectedSkill[]>(() =>
    (profile.skills ?? []).map(({ skillId, proficiencyLevel }) => ({ skillId, proficiencyLevel })),
  );
  const [step, setStep] = useState(1),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false);
  function skillName(skill: Skill) {
    return t('p2.skills.' + skill.slug, { defaultValue: skill.name });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setSaved(false);
    const payload: Record<string, unknown> = { onboardingCompleted: step === 2 };
    for (const name of [...firstFields[role], ...(step === 2 ? secondFields[role] : [])]) {
      const value = values[name]?.trim() ?? '';
      if (name === 'languages')
        payload[name] = value
          .split(',')
          .map((language) => language.trim())
          .filter(Boolean);
      else if (numeric.has(name)) payload[name] = value ? Number(value) : null;
      else if (value) payload[name] = value;
      else if (!requiredFields.has(name)) payload[name] = null;
    }
    if (step === 2 && role === 'student') payload.skills = selected;
    try {
      await api.put('/' + role + 's/me', payload);
      await refreshUser();
      if (step === 1) {
        setStep(2);
        setSaved(true);
      } else setDone(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <Card className="form-card">
        <div className="completion-panel" role="status">
          <Badge tone="green">{t('p2.saved')}</Badge>
          <h2>{t('p2.onboardingComplete')}</h2>
          <p>{t(role === 'student' ? 'p2.pendingText' : 'p2.artisanCompleteText')}</p>
          {role === 'student' && <Badge>{t('p2.status.PENDING')}</Badge>}
          <ButtonLink to={'/dashboard/' + role}>{t('p2.goDashboard')}</ButtonLink>
        </div>
      </Card>
    );
  return (
    <Card className="form-card">
      <div className="onboarding-progress">
        <span id="onboarding-progress-label">{t('p2.stepOf', { step, total: 2 })}</span>
        <progress aria-labelledby="onboarding-progress-label" max={2} value={step} />
      </div>
      <form onSubmit={save} aria-busy={busy}>
        <h2 className="form-section-title">
          {t(
            step === 1
              ? 'p2.yourDetails'
              : role === 'student'
                ? 'p2.yourSkills'
                : 'p2.yourBusiness',
          )}
        </h2>
        <p className="field-hint">{t('p2.requiredNote')}</p>
        {saved && (
          <p role="status" className="success-note">
            {t('p2.draftSaved')}
          </p>
        )}
        {role === 'student' && profile.verificationStatus === 'VERIFIED' && (
          <p className="notice">{t('p2.editReviewNote')}</p>
        )}
        <ErrorNotice error={error} />
        <div className="form-grid">
          {(step === 1 ? firstFields[role] : secondFields[role]).map((name) => (
            <FormField
              key={name}
              name={name}
              label={t('p2.fields.' + name)}
              kind={longText.has(name) ? 'textarea' : 'input'}
              type={numeric.has(name) ? 'number' : name === 'portfolioUrl' ? 'url' : 'text'}
              value={values[name] ?? ''}
              onChange={(event) => setValues({ ...values, [name]: event.target.value })}
              required={requiredFields.has(name) || (name === 'biography' && role === 'student')}
              min={name === 'studyYear' || name === 'weeklyAvailabilityHours' ? 1 : 0}
              max={
                name === 'studyYear'
                  ? 8
                  : name === 'weeklyAvailabilityHours'
                    ? 60
                    : name === 'currentMonthlyOrders'
                      ? 10000000
                      : 9999999999.99
              }
              step={
                name === 'expectedMonthlyRate' || name === 'currentMonthlyRevenue' ? '0.01' : '1'
              }
              maxLength={maximums[name] ?? 2000}
              hint={
                name === 'languages'
                  ? t('p2.languagesHint')
                  : name === 'onlinePresence'
                    ? t('p2.onlineHint')
                    : !requiredFields.has(name) && !(name === 'biography' && role === 'student')
                      ? t('p2.optional')
                      : undefined
              }
            />
          ))}
        </div>
        {step === 2 && role === 'student' && (
          <fieldset className="skills-fieldset">
            <legend>{t('p2.selectSkills')}</legend>
            <p className="field-hint">{t('p2.skillsHint')}</p>
            <div className="skills-grid">
              {available.map((skill) => {
                const choice = selected.find((item) => item.skillId === skill.id);
                return (
                  <div className={choice ? 'skill-option chosen' : 'skill-option'} key={skill.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(choice)}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...selected, { skillId: skill.id, proficiencyLevel: 'BEGINNER' }]
                              : selected.filter((item) => item.skillId !== skill.id),
                          )
                        }
                      />
                      <span>{skillName(skill)}</span>
                    </label>
                    {choice && (
                      <FormField
                        name={'proficiency-' + skill.id}
                        label={t('p2.proficiencyFor', { skill: skillName(skill) })}
                        kind="select"
                        value={choice.proficiencyLevel}
                        onChange={(event) =>
                          setSelected(
                            selected.map((item) =>
                              item.skillId === skill.id
                                ? {
                                    ...item,
                                    proficiencyLevel: event.target
                                      .value as SelectedSkill['proficiencyLevel'],
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => (
                          <option value={level} key={level}>
                            {t('p2.level.' + level)}
                          </option>
                        ))}
                      </FormField>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}
        {role === 'student' && step === 2 && <p className="notice">{t('p2.pendingText')}</p>}
        <FormActions busy={busy}>
          {t(
            step === 1
              ? 'p2.saveContinue'
              : role === 'student'
                ? 'p2.submitReview'
                : 'p2.finishOnboarding',
          )}
        </FormActions>
        {step === 2 && (
          <Button
            disabled={busy}
            variant="ghost"
            onClick={() => {
              setStep(1);
              setSaved(false);
            }}
          >
            {t('p2.previous')}
          </Button>
        )}
      </form>
      <span className="sr-only">{i18n.resolvedLanguage === 'hi' ? 'हिन्दी' : 'English'}</span>
    </Card>
  );
}
export function OnboardingPage({
  role,
  embedded = false,
}: {
  role: OnboardingRole;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const profile = useRemoteData<Profile>('/' + role + 's/me'),
    skills = useRemoteData<Skill[]>('/skills');
  usePageTitle(t('p2.onboarding.' + role));
  const title = t('p2.onboarding.' + role);
  return (
    <section className={embedded ? 'profile-page' : 'container phase2-page onboarding-page'}>
      {!embedded && (
        <>
          <p className="eyebrow">{t('p2.makeItYours')}</p>
          <h1>{title}</h1>
        </>
      )}
      <p className="page-intro">{t('p2.onboardingIntro')}</p>
      {profile.loading || skills.loading ? (
        <Loading />
      ) : profile.error || skills.error ? (
        <>
          <ErrorNotice error={profile.error || skills.error} />
          <Button
            onClick={() => {
              profile.reload();
              skills.reload();
            }}
          >
            {t('p2.retry')}
          </Button>
        </>
      ) : (
        profile.data && (
          <ProfileEditor
            key={profile.data.id}
            role={role}
            profile={profile.data}
            available={skills.data ?? []}
          />
        )
      )}
    </section>
  );
}
