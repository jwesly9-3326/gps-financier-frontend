// 📊 BUDGET - Page de gestion du budget
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../context/UserDataContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { UpgradeModal } from '../../components/common/UpgradePrompt';
import useGuideProgress from '../../hooks/useGuideProgress';
import PageGuideModal from '../../components/common/PageGuideModal';
// 🆕 Modals tactiles pour saisie mobile-friendly
import NumpadModal from '../../components/common/NumpadModal';
import DayPickerModal from '../../components/common/DayPickerModal';
