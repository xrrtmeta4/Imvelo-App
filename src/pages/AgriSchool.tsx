import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, PlayCircle, FileText, Award, MessageCircle, CheckCircle2, Loader2, Users, BookOpen, GraduationCap, Download, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { openDodoCheckout } from '@/lib/dodoPayments';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeJsonParse } from '@/lib/safeJson';

const CERTIFICATE_PRICE = 50;
const CERTIFICATE_CURRENCY = 'SZL';
const CERTIFICATE_PRODUCT_ID = 'pdt_0NYZaqcOARihEXXOPIdmC';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface CourseModule {
  title: string;
  content: string[];
  readTime?: string;
}

interface Course {
  id: string;
  titleKey: string;
  descriptionKey: string;
  categoryKey: string;
  icon: any;
  color: string;
  bgGradient: string;
  coverEmoji: string;
  duration: string;
  level: string;
  modules: CourseModule[];
  quiz: QuizQuestion[];
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

const COURSES: Course[] = [
  {
    id: 'crop-production',
    titleKey: 'cropProduction',
    descriptionKey: 'cropProductionDesc',
    categoryKey: 'categoryCrop',
    icon: BookOpen,
    color: 'text-green-700',
    bgGradient: 'from-green-500 to-emerald-600',
    coverEmoji: '🌾',
    duration: '4 weeks',
    level: 'Beginner',
    modules: [
      {
        title: 'Introduction to Crop Production',
        content: [
          'Crop production is the science and practice of growing plants for food, fiber, and fuel.',
          'Key factors include soil health, climate, water availability, and seed selection.',
          'Modern crop production combines traditional knowledge with scientific research.',
          'Sustainable practices ensure long-term productivity and environmental health.',
        ],
        readTime: '5 min read',
      },
      {
        title: 'Soil Preparation and Seed Selection',
        content: [
          'Prepare soil by plowing, harrowing, and adding organic matter.',
          'Select seeds based on local climate, soil type, and market demand.',
          'Use certified seeds to ensure high germination rates and disease resistance.',
          'Treat seeds before planting to protect against soil-borne diseases.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Planting Techniques and Spacing',
        content: [
          'Correct spacing ensures each plant gets enough light, water, and nutrients.',
          'Follow seed packet instructions for depth and spacing.',
          'Plant in rows or beds depending on crop type and farm size.',
          'Consider companion planting to maximize space and reduce pests.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Crop Care and Maintenance',
        content: [
          'Regular weeding reduces competition for nutrients and water.',
          'Apply fertilizers based on soil test results for optimal growth.',
          'Monitor for pests and diseases regularly — early detection saves crops.',
          'Practice crop rotation to maintain soil fertility and break pest cycles.',
        ],
        readTime: '8 min read',
      },
      {
        title: 'Harvesting and Post-Harvest Handling',
        content: [
          'Harvest at the right maturity stage for maximum quality and yield.',
          'Handle crops gently to avoid bruising and damage.',
          'Dry and store crops properly to prevent spoilage and pest infestation.',
          'Sort and grade produce for better market prices.',
        ],
        readTime: '6 min read',
      },
    ],
    quiz: [
      {
        question: 'What is the primary goal of crop production?',
        options: ['Growing ornamental plants', 'Growing plants for food, fiber, and fuel', 'Clearing land', 'Reducing soil fertility'],
        correctIndex: 1,
      },
      {
        question: 'Why is seed selection important?',
        options: ['It is not important', 'It determines yield, disease resistance, and adaptation', 'Only color matters', 'Only size matters'],
        correctIndex: 1,
      },
      {
        question: 'What is crop rotation?',
        options: ['Planting the same crop every year', 'Rotating crops to maintain soil fertility', 'Removing all crops', 'Using only chemicals'],
        correctIndex: 1,
      },
      {
        question: 'When should you harvest crops?',
        options: ['As early as possible', 'At the right maturity stage', 'When they are overripe', 'It does not matter'],
        correctIndex: 1,
      },
      {
        question: 'Why is weeding important?',
        options: ['It is not important', 'Weeds compete for nutrients and water', 'Weeds improve soil', 'Weeds attract beneficial insects'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'livestock-management',
    titleKey: 'livestockManagement',
    descriptionKey: 'livestockManagementDesc',
    categoryKey: 'categoryLivestock',
    icon: BookOpen,
    color: 'text-amber-700',
    bgGradient: 'from-amber-500 to-orange-600',
    coverEmoji: '🐄',
    duration: '5 weeks',
    level: 'Intermediate',
    modules: [
      {
        title: 'Introduction to Livestock Management',
        content: [
          'Livestock management involves caring for animals including feeding, breeding, and health management.',
          'Healthy animals produce more meat, milk, eggs, and offspring.',
          'Good management practices improve animal welfare and farm profitability.',
          'Understanding animal behavior helps in handling and reducing stress.',
        ],
        readTime: '5 min read',
      },
      {
        title: 'Animal Nutrition and Feeding',
        content: [
          'Provide balanced rations with protein, energy, vitamins, and minerals.',
          'Adjust feed based on animal age, weight, production stage, and activity.',
          'Ensure access to clean, fresh water at all times.',
          'Use locally available feeds to reduce costs and improve sustainability.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Housing and Hygiene',
        content: [
          'Provide clean, dry, well-ventilated shelter for all animals.',
          'Clean housing regularly to prevent disease buildup.',
          'Ensure proper drainage and sunlight in animal pens.',
          'Separate sick animals immediately to prevent spread of disease.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Animal Health and Disease Prevention',
        content: [
          'Vaccinate animals according to a proper schedule.',
          'Watch for signs of illness: lethargy, loss of appetite, abnormal discharge.',
          'Work with a veterinarian for regular checkups and emergency care.',
          'Keep records of vaccinations, treatments, and production metrics.',
        ],
        readTime: '8 min read',
      },
      {
        title: 'Breeding and Record Keeping',
        content: [
          'Select breeding animals based on health, productivity, and genetics.',
          'Keep accurate records of breeding dates, births, and parentage.',
          'Use artificial insemination to access superior genetics.',
          'Plan breeding seasons to match feed availability and market demand.',
        ],
        readTime: '6 min read',
      },
    ],
    quiz: [
      {
        question: 'What does balanced animal nutrition include?',
        options: ['Only water', 'Protein, energy, vitamins, and minerals', 'Only grass', 'Only grains'],
        correctIndex: 1,
      },
      {
        question: 'Why is animal housing important?',
        options: ['It is not important', 'It protects from weather and disease', 'Only for storage', 'Only for milking'],
        correctIndex: 1,
      },
      {
        question: 'What should you do with sick animals?',
        options: ['Ignore them', 'Separate them immediately', 'Sell them immediately', 'Feed them more'],
        correctIndex: 1,
      },
      {
        question: 'Why is record keeping important?',
        options: ['It is a waste of time', 'It tracks health, breeding, and productivity', 'Only for tax purposes', 'Only for show'],
        correctIndex: 1,
      },
      {
        question: 'What should you consider when selecting breeding animals?',
        options: ['Only color', 'Health, productivity, and genetics', 'Only size', 'Only age'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'soil-science',
    titleKey: 'soilScience',
    descriptionKey: 'soilScienceDesc',
    categoryKey: 'categorySoil',
    icon: BookOpen,
    color: 'text-amber-800',
    bgGradient: 'from-amber-600 to-yellow-500',
    coverEmoji: '🌱',
    duration: '4 weeks',
    level: 'Beginner',
    modules: [
      {
        title: 'Introduction to Soil Science',
        content: [
          'Soil is a living ecosystem that supports plant growth.',
          'It is composed of minerals, organic matter, water, air, and living organisms.',
          'Understanding soil properties helps farmers make better decisions.',
          'Healthy soil leads to healthy crops and sustainable farming.',
        ],
        readTime: '5 min read',
      },
      {
        title: 'Soil Types and Properties',
        content: [
          'Clay soils hold nutrients well but drain slowly.',
          'Sandy soils drain quickly but need frequent watering.',
          'Loam soils are ideal for most crops — balanced texture and drainage.',
          'Test your soil to understand its pH, texture, and nutrient levels.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Soil Fertility and Fertilizers',
        content: [
          'Nitrogen (N), Phosphorus (P), and Potassium (K) are the primary nutrients.',
          'Use soil tests to determine fertilizer needs and avoid over-application.',
          'Organic fertilizers improve soil structure and microbial activity.',
          'Apply fertilizers at the right time and in the right amount.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Soil and Water Conservation',
        content: [
          'Mulching reduces soil erosion and conserves moisture.',
          'Contour farming and terracing prevent soil loss on slopes.',
          'Cover crops protect soil between main crop seasons.',
          'Avoid over-tilling which destroys soil structure and organic matter.',
        ],
        readTime: '6 min read',
      },
    ],
    quiz: [
      {
        question: 'What is the ideal soil type for most crops?',
        options: ['Pure clay', 'Pure sand', 'Loam', 'Pure gravel'],
        correctIndex: 2,
      },
      {
        question: 'What are the primary nutrients for plants?',
        options: ['Only water', 'N, P, and K', 'Only nitrogen', 'Only carbon'],
        correctIndex: 1,
      },
      {
        question: 'How does mulching help soil?',
        options: ['It increases erosion', 'It reduces erosion and conserves moisture', 'It has no effect', 'It kills soil organisms'],
        correctIndex: 1,
      },
      {
        question: 'What does over-tilling do to soil?',
        options: ['Improves it', 'Destroys soil structure', 'Has no effect', 'Adds nutrients'],
        correctIndex: 1,
      },
      {
        question: 'Why is soil testing important?',
        options: ['It is not important', 'It determines fertilizer needs and pH', 'Only for scientists', 'Only for building'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'pest-control',
    titleKey: 'pestControl',
    descriptionKey: 'pestControlDesc',
    categoryKey: 'categoryPest',
    icon: BookOpen,
    color: 'text-red-700',
    bgGradient: 'from-red-500 to-rose-600',
    coverEmoji: '🐛',
    duration: '4 weeks',
    level: 'Intermediate',
    modules: [
      {
        title: 'Introduction to Pest Management',
        content: [
          'Pests are organisms that damage crops, reduce yields, and spread disease.',
          'Integrated Pest Management (IPM) combines biological, cultural, and chemical methods.',
          'Prevention is always better than cure — healthy plants resist pests better.',
          'Identify pests correctly before choosing control methods.',
        ],
        readTime: '5 min read',
      },
      {
        title: 'Common Pests and Diseases',
        content: [
          'Learn to identify common pests: aphids, caterpillars, beetles, and mites.',
          'Recognize disease symptoms: leaf spots, wilting, yellowing, and rot.',
          'Keep a pest scouting log to track problems and measure effectiveness.',
          'Use extension resources and AI tools for accurate identification.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Biological and Cultural Control',
        content: [
          'Introduce natural enemies: ladybugs, parasitic wasps, and beneficial fungi.',
          'Use crop rotation to break pest life cycles.',
          'Practice companion planting: some plants repel pests naturally.',
          'Remove and destroy infested plant material to prevent spread.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Safe Pesticide Use',
        content: [
          'Choose pesticides carefully — read labels and follow instructions.',
          'Wear protective equipment when handling chemicals.',
          'Apply at the right time and dose — more is not better.',
          'Observe pre-harvest intervals to ensure safe food.',
        ],
        readTime: '6 min read',
      },
    ],
    quiz: [
      {
        question: 'What is Integrated Pest Management (IPM)?',
        options: ['Only using chemicals', 'Combining biological, cultural, and chemical methods', 'Only removing pests by hand', 'Ignoring pests'],
        correctIndex: 1,
      },
      {
        question: 'Why is pest identification important?',
        options: ['It is not important', 'Different pests need different control methods', 'All pests are the same', 'Only for scientists'],
        correctIndex: 1,
      },
      {
        question: 'What is a natural pest control method?',
        options: ['Only chemicals', 'Introducing beneficial insects', 'Only spraying water', 'Removing all plants'],
        correctIndex: 1,
      },
      {
        question: 'Why should you read pesticide labels?',
        options: ['Labels are not important', 'To use safely and effectively', 'Only for legal reasons', 'Only for dealers'],
        correctIndex: 1,
      },
      {
        question: 'What is companion planting?',
        options: ['Planting the same crop together', 'Planting different crops together for mutual benefit', 'Planting in containers', 'Planting only one crop'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'climate-smart',
    titleKey: 'climateSmart',
    descriptionKey: 'climateSmartDesc',
    categoryKey: 'categoryClimate',
    icon: BookOpen,
    color: 'text-sky-700',
    bgGradient: 'from-sky-500 to-blue-600',
    coverEmoji: '🌍',
    duration: '5 weeks',
    level: 'Advanced',
    modules: [
      {
        title: 'Understanding Climate Change in Agriculture',
        content: [
          'Climate change affects rainfall patterns, temperature, and growing seasons.',
          'Extreme weather events are becoming more frequent and severe.',
          'Agriculture both contributes to and is affected by climate change.',
          'Adapting farming practices is essential for food security.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Adaptation Strategies',
        content: [
          'Use drought-tolerant and flood-resistant crop varieties.',
          'Practice agroforestry: integrate trees with crops and livestock.',
          'Implement water harvesting and efficient irrigation systems.',
          'Diversify crops and income sources to spread risk.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Mitigation Practices',
        content: [
          'Reduce tillage to keep carbon in the soil.',
          'Use cover crops and organic amendments to sequester carbon.',
          'Manage livestock manure to reduce methane emissions.',
          'Plant trees and maintain forests to absorb carbon dioxide.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Building Resilience',
        content: [
          'Build soil health to buffer against weather extremes.',
          'Create farm emergency plans for droughts, floods, and storms.',
          'Join farmer groups for shared knowledge and resources.',
          'Use weather forecasts and early warning systems.',
        ],
        readTime: '5 min read',
      },
    ],
    quiz: [
      {
        question: 'How does climate change affect agriculture?',
        options: ['No effect', 'Changes rainfall, temperature, and seasons', 'Only positive effects', 'Only negative effects'],
        correctIndex: 1,
      },
      {
        question: 'What is agroforestry?',
        options: ['Clearing forests for farming', 'Integrating trees with crops and livestock', 'Only growing trees', 'Only growing crops'],
        correctIndex: 1,
      },
      {
        question: 'How can farmers mitigate climate change?',
        options: ['Only using chemicals', 'Reducing tillage, using cover crops, managing manure', 'Only cutting trees', 'Only burning waste'],
        correctIndex: 1,
      },
      {
        question: 'What is crop diversification?',
        options: ['Growing only one crop', 'Growing multiple crops to spread risk', 'Only growing cash crops', 'Only growing food crops'],
        correctIndex: 1,
      },
      {
        question: 'Why is soil health important for climate resilience?',
        options: ['It is not important', 'Healthy soil buffers against weather extremes', 'Only for yield', 'Only for appearance'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'agri-business',
    titleKey: 'agriBusiness',
    descriptionKey: 'agriBusinessDesc',
    categoryKey: 'categoryBusiness',
    icon: BookOpen,
    color: 'text-indigo-700',
    bgGradient: 'from-indigo-500 to-purple-600',
    coverEmoji: '💼',
    duration: '5 weeks',
    level: 'Intermediate',
    modules: [
      {
        title: 'Introduction to Agricultural Business',
        content: [
          'Farming is not just production — it is also a business.',
          'Understanding markets, costs, and profits is essential for success.',
          'Good record keeping helps you make informed decisions.',
          'Start small, plan carefully, and expand gradually.',
        ],
        readTime: '5 min read',
      },
      {
        title: 'Market Research and Planning',
        content: [
          'Research your local market: what crops are in demand and at what price.',
          'Identify your target customers: consumers, traders, or institutions.',
          'Plan your production calendar to match market windows.',
          'Consider value addition: processing, packaging, and branding.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Financial Management',
        content: [
          'Track all income and expenses to know your true profit.',
          'Separate farm finances from personal finances.',
          'Plan for seasonal cash flow gaps.',
          'Reinvest profits to grow your business sustainably.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Marketing and Sales',
        content: [
          'Build relationships with buyers before harvest time.',
          'Use social media and mobile apps to reach more customers.',
          'Offer quality produce consistently to build trust.',
          'Join farmer cooperatives for better bargaining power.',
        ],
        readTime: '6 min read',
      },
    ],
    quiz: [
      {
        question: 'Why is market research important?',
        options: ['It is not important', 'It helps you understand demand and pricing', 'Only for large farms', 'Only for traders'],
        correctIndex: 1,
      },
      {
        question: 'What is value addition?',
        options: ['Adding more water', 'Processing, packaging, and branding products', 'Adding more fertilizer', 'Only selling raw produce'],
        correctIndex: 1,
      },
      {
        question: 'Why separate farm and personal finances?',
        options: ['It is not necessary', 'To track true profit and make better decisions', 'Only for tax purposes', 'Only for banks'],
        correctIndex: 1,
      },
      {
        question: 'How can farmers get better prices?',
        options: ['Selling individually', 'Joining cooperatives for collective bargaining', 'Only selling at harvest', 'Only selling to middlemen'],
        correctIndex: 1,
      },
      {
        question: 'What is the benefit of good record keeping?',
        options: ['No benefit', 'Informed decision making and profit tracking', 'Only for accountants', 'Only for loans'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'irrigation',
    titleKey: 'irrigationManagement',
    descriptionKey: 'irrigationManagementDesc',
    categoryKey: 'categoryIrrigation',
    icon: BookOpen,
    color: 'text-cyan-700',
    bgGradient: 'from-cyan-500 to-teal-600',
    coverEmoji: '💧',
    duration: '4 weeks',
    level: 'Intermediate',
    modules: [
      {
        title: 'Introduction to Irrigation',
        content: [
          'Irrigation is the artificial application of water to crops.',
          'It is essential in areas with low or unreliable rainfall.',
          'Efficient irrigation saves water and increases yields.',
          'Choose the right method based on crop, soil, and water availability.',
        ],
        readTime: '5 min read',
      },
      {
        title: 'Irrigation Methods',
        content: [
          'Surface irrigation: water flows over the soil surface — simple but wasteful.',
          'Sprinkler irrigation: water sprayed through the air — good for many crops.',
          'Drip irrigation: water delivered directly to roots — most efficient.',
          'Choose based on farm size, crop type, and water source.',
        ],
        readTime: '7 min read',
      },
      {
        title: 'Water Management and Scheduling',
        content: [
          'Water deeply but less frequently to encourage deep root growth.',
          'Water early morning or late evening to reduce evaporation.',
          'Use soil moisture sensors or the feel method to check water needs.',
          'Adjust scheduling based on weather, crop stage, and soil type.',
        ],
        readTime: '6 min read',
      },
      {
        title: 'Sustainable Water Use',
        content: [
          'Harvest rainwater from roofs and surfaces.',
          'Use recycled water where safe and appropriate.',
          'Fix leaks and maintain irrigation systems regularly.',
          'Choose drought-tolerant crops to reduce water demand.',
        ],
        readTime: '5 min read',
      },
    ],
    quiz: [
      {
        question: 'What is irrigation?',
        options: ['Rainfall', 'Artificial application of water to crops', 'Only for lawns', 'Only for rice'],
        correctIndex: 1,
      },
      {
        question: 'Which irrigation method is most efficient?',
        options: ['Flood irrigation', 'Drip irrigation', 'Sprinkler irrigation', 'No irrigation'],
        correctIndex: 1,
      },
      {
        question: 'When is the best time to irrigate?',
        options: ['Midday', 'Early morning or late evening', 'At midnight', 'Never'],
        correctIndex: 1,
      },
      {
        question: 'Why is water scheduling important?',
        options: ['It is not important', 'It prevents over/under watering and saves water', 'Only for large farms', 'Only for experts'],
        correctIndex: 1,
      },
      {
        question: 'What is rainwater harvesting?',
        options: ['Collecting rainwater for later use', 'Only for drinking', 'Only for rivers', 'It is illegal'],
        correctIndex: 1,
      },
    ],
  },
];

const COMMUNITY_STORAGE_KEY = (courseId: string, userId: string) => `imvelo_agrischool_comments_${courseId}_${userId}`;

const AgriSchool = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const [showCommunity, setShowCommunity] = useState(false);
  const [communityComments, setCommunityComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');

  const course = useMemo(() => COURSES.find(c => c.id === selectedCourseId), [selectedCourseId]);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`imvelo_agrischool_progress_${user.id}`);
    const data = safeJsonParse<{ enrolled: string[]; completed: string[] }>(stored, { enrolled: [], completed: [] });
    setEnrolledCourses(new Set(data.enrolled || []));
    setCompletedCourses(new Set(data.completed || []));

    const comments: Record<string, Comment[]> = {};
    COURSES.forEach(c => {
      const key = COMMUNITY_STORAGE_KEY(c.id, user.id);
      const raw = localStorage.getItem(key);
      comments[c.id] = safeJsonParse<Comment[]>(raw, []);
    });
    setCommunityComments(comments);
  }, [user]);

  const saveProgress = (enrolled: Set<string>, completed: Set<string>) => {
    if (!user) return;
    localStorage.setItem(`imvelo_agrischool_progress_${user.id}`, JSON.stringify({
      enrolled: Array.from(enrolled),
      completed: Array.from(completed),
    }));
  };

  const saveComments = (courseId: string, comments: Comment[]) => {
    if (!user) return;
    localStorage.setItem(COMMUNITY_STORAGE_KEY(courseId, user.id), JSON.stringify(comments));
    setCommunityComments(prev => ({ ...prev, [courseId]: comments }));
  };

  const handleEnroll = async (courseId: string) => {
    if (!user?.email) {
      toast.error('Please sign in to enroll');
      return;
    }
    setLoading(true);
    try {
      const courseData = COURSES.find(c => c.id === courseId);
      if (!courseData) return;

      await openDodoCheckout({
        productId: CERTIFICATE_PRODUCT_ID,
        productName: `AgriSchool Certificate: ${t(courseData.titleKey)}`,
        amount: CERTIFICATE_PRICE,
        currency: CERTIFICATE_CURRENCY,
        customerEmail: user.email,
        customerName: user.user_metadata?.full_name || 'Customer',
        successUrl: window.location.origin + '/agri-school?success=true',
        cancelUrl: window.location.origin + '/agri-school',
        metadata: {
          course_id: courseId,
          user_id: user.id,
          type: 'certificate_purchase',
        },
      });

      const newEnrolled = new Set(enrolledCourses);
      newEnrolled.add(courseId);
      setEnrolledCourses(newEnrolled);
      saveProgress(newEnrolled, completedCourses);
      toast.success('Enrollment initiated! Complete payment to access the course.');
    } catch (err: any) {
      console.error('Enrollment error:', err);
      toast.error(err?.message || 'Failed to start enrollment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLearning = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveModule(0);
    setQuizStarted(false);
    setQuizAnswers([]);
    setQuizSubmitted(false);
    setShowCommunity(false);
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    if (!course || quizAnswers.length !== course.quiz.length) {
      toast.error('Please answer all questions');
      return;
    }
    setQuizSubmitted(true);
    const correctCount = course.quiz.reduce((count, q, i) => {
      return count + (quizAnswers[i] === q.correctIndex ? 1 : 0);
    }, 0);
    const passed = correctCount >= course.quiz.length * 0.7;
    if (passed) {
      toast.success(`Congratulations! You scored ${correctCount}/${course.quiz.length}. You can now purchase your certificate.`);
    } else {
      toast.error(`You scored ${correctCount}/${course.quiz.length}. You need 70% to pass. Please review and retake.`);
    }
  };

  const handleBuyCertificate = async () => {
    if (!user?.email) {
      toast.error('Please sign in to purchase certificate');
      return;
    }
    if (!course) return;
    setLoading(true);
    try {
      await openDodoCheckout({
        productId: CERTIFICATE_PRODUCT_ID,
        productName: `AgriSchool Certificate: ${t(course.titleKey)}`,
        amount: CERTIFICATE_PRICE,
        currency: CERTIFICATE_CURRENCY,
        customerEmail: user.email,
        customerName: user.user_metadata?.full_name || 'Customer',
        successUrl: window.location.origin + '/agri-school?success=true',
        cancelUrl: window.location.origin + '/agri-school',
        metadata: {
          course_id: course.id,
          user_id: user.id,
          type: 'certificate_purchase',
        },
      });
      toast.success('Payment initiated! Complete payment to download your certificate.');
    } catch (err: any) {
      console.error('Certificate purchase error:', err);
      toast.error(err?.message || 'Failed to start certificate purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = (courseId: string) => {
    const courseData = COURSES.find(c => c.id === courseId);
    if (!courseData || !user) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(34, 139, 34);
      doc.text('Imvelo', pageWidth / 2, 38, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text("Farmer's Best Friend", pageWidth / 2, 46, { align: 'center' });

      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.6);
      doc.line(margin, 52, pageWidth - margin, 52);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Certificate of Completion', pageWidth / 2, 66, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text('This is to certify that', pageWidth / 2, 80, { align: 'center' });

      const userName = user.user_metadata?.full_name || user.email || 'Student';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(34, 139, 34);
      doc.text(userName, pageWidth / 2, 92, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text('has successfully completed the course', pageWidth / 2, 105, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(t(courseData.titleKey), pageWidth / 2, 118, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, 135, { align: 'center' });
      doc.text('Certificate Fee: E50 SZL', pageWidth / 2, 143, { align: 'center' });

      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.4);
      doc.line(margin, 152, pageWidth - margin, 152);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text("Imvelo - Farmer's Best Friend", pageWidth / 2, 162, { align: 'center' });
      doc.text('Email: imveloapps@gmail.com | Phone: +268 7921 5621', pageWidth / 2, 169, { align: 'center' });
      doc.text('Mbabane, Eswatini', pageWidth / 2, 176, { align: 'center' });

      doc.save(`imvelo-certificate-${courseId}-${Date.now()}.pdf`);
      toast.success('Certificate downloaded!');
    } catch (err) {
      console.error('Certificate generation error:', err);
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

  const handlePostComment = () => {
    if (!course || !user || !newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email || 'Anonymous',
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...(communityComments[course.id] || []), comment];
    saveComments(course.id, updated);
    setNewComment('');
    toast.success('Comment posted!');
  };

  if (selectedCourseId && course) {
    const isEnrolled = enrolledCourses.has(course.id);
    const isCompleted = completedCourses.has(course.id);
    const passed = quizSubmitted && quizAnswers.reduce((count, q, i) => count + (quizAnswers[i] === q.correctIndex ? 1 : 0), 0) >= course.quiz.length * 0.7;
    const comments = communityComments[course.id] || [];

    if (!isEnrolled) {
      return (
        <div className="min-h-screen bg-background">
          <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-4 px-4">
            <div className="max-w-screen-sm mx-auto flex items-center gap-3">
              <button onClick={() => setSelectedCourseId(null)} className="text-primary-foreground/80">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">{t(course.titleKey)}</h1>
            </div>
          </header>
          <div className="max-w-screen-sm mx-auto px-4 py-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`text-4xl`}>{course.coverEmoji}</div>
                  <div>
                    <CardTitle className="text-base">{t(course.titleKey)}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{t('freeLearning')} · {course.duration} · {course.level}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t(course.descriptionKey)}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('modules')}</span>
                  <span className="font-semibold">{course.modules.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('quizQuestions')}</span>
                  <span className="font-semibold">{course.quiz.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('certificatePrice')}</span>
                  <span className="font-semibold">E{CERTIFICATE_PRICE} {CERTIFICATE_CURRENCY}</span>
                </div>
                <Button onClick={() => handleEnroll(course.id)} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                  {loading ? t('processing') : t('enrollFree')}
                </Button>
                <p className="text-xs text-center text-muted-foreground">Learning is free. Certificate purchase is optional.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (!quizStarted) {
      return (
        <div className="min-h-screen bg-background">
          <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-4 px-4">
            <div className="max-w-screen-sm mx-auto flex items-center gap-3">
              <button onClick={() => { setSelectedCourseId(null); setQuizStarted(false); }} className="text-primary-foreground/80">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold">{t(course.titleKey)}</h1>
                <p className="text-xs text-white/80">{t('courseContent')}</p>
              </div>
            </div>
          </header>
          <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-5">
            {course.modules.map((module, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-5 h-5 text-primary" />
                    {idx + 1}. {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {module.content.map((paragraph, pIdx) => (
                    <p key={pIdx} className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
                  ))}
                </CardContent>
              </Card>
            ))}
            <div className="flex gap-3">
              <Button onClick={() => setQuizStarted(true)} className="flex-1 gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t('takeQuiz')} ({course.quiz.length} {t('quizQuestions').toLowerCase()})
              </Button>
              <Button variant="ghost" onClick={() => setShowCommunity(!showCommunity)} className="flex-1 gap-2">
                <MessageCircle className="w-4 h-4" />
                {t('community')}
              </Button>
            </div>
            {showCommunity && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    {t('community')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('noDiscussions')}</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map(comment => (
                        <div key={comment.id} className="p-3 rounded-lg bg-accent/50 space-y-1">
                          <p className="text-sm font-medium text-foreground">{comment.userName}</p>
                          <p className="text-sm text-muted-foreground">{comment.text}</p>
                          <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {user && (
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder={t('writeComment')}
                        className="flex-1"
                        onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                      />
                      <Button onClick={handlePostComment} size="sm">{t('postComment')}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }

    if (!quizSubmitted) {
      return (
        <div className="min-h-screen bg-background">
          <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-4 px-4">
            <div className="max-w-screen-sm mx-auto flex items-center gap-3">
              <button onClick={() => { setQuizStarted(false); setQuizSubmitted(false); }} className="text-primary-foreground/80">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">{t('quizQuestions')}</h1>
            </div>
          </header>
          <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-5">
            {course.quiz.map((q, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {q.options.map((option, optIdx) => (
                    <Button
                      key={optIdx}
                      variant={quizAnswers[idx] === optIdx ? 'default' : 'outline'}
                      className="w-full justify-start text-left"
                      onClick={() => handleQuizAnswer(idx, optIdx)}
                    >
                      {option}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button onClick={handleSubmitQuiz} disabled={quizAnswers.length !== course.quiz.length} className="w-full gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t('submitQuiz')}
            </Button>
          </div>
        </div>
      );
    }

    const correctCount = course.quiz.reduce((count, q, i) => count + (quizAnswers[i] === q.correctIndex ? 1 : 0), 0);
    const quizPassed = correctCount >= course.quiz.length * 0.7;

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-4 px-4">
          <div className="max-w-screen-sm mx-auto flex items-center gap-3">
            <button onClick={() => { setQuizStarted(false); setQuizSubmitted(false); }} className="text-primary-foreground/80">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">{t('quizResult')}</h1>
          </div>
        </header>
        <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {quizPassed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                {quizPassed ? t('congratulations') : t('keepLearning')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('yourScore')}: {correctCount}/{course.quiz.length} ({Math.round((correctCount / course.quiz.length) * 100)}%).
                {quizPassed ? ` ${t('passQuiz')}` : ` ${t('keepLearning')}`}
              </p>
              {quizPassed && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">You passed! {t('passCertificate')}</p>
                  </div>
                  <Button onClick={() => handleBuyCertificate()} disabled={loading} className="w-full gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    {loading ? t('processing') : `Buy Certificate - E${CERTIFICATE_PRICE}`}
                  </Button>
                  <Button variant="outline" onClick={() => generateCertificate(course.id)} className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    {t('downloadCertificate')}
                  </Button>
                </div>
              )}
              {!quizPassed && (
                <Button onClick={() => { setQuizStarted(false); setQuizSubmitted(false); setQuizAnswers([]); }} className="w-full">
                  {t('retakeQuiz')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-4 px-4">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground/80">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{t('agriSchool')}</h1>
            <p className="text-xs text-white/80">{t('agriSchoolDesc')}</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4">
          {COURSES.map(courseData => {
            const Icon = courseData.icon;
            const isEnrolled = enrolledCourses.has(courseData.id);
            const isCompleted = completedCourses.has(courseData.id);

            return (
              <Card key={courseData.id} className="overflow-hidden">
                <div className={`h-32 bg-gradient-to-br ${courseData.bgGradient} flex items-center justify-center relative`}>
                  <span className="text-5xl">{courseData.coverEmoji}</span>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                    {courseData.level}
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t(courseData.titleKey)}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{t(courseData.descriptionKey)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{courseData.duration}</span>
                    <span>{courseData.modules.length} {t('modules').toLowerCase()}</span>
                  </div>
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      {t('completed')}
                    </div>
                  ) : isEnrolled ? (
                    <Button onClick={() => handleStartLearning(courseData.id)} className="w-full gap-2">
                      <PlayCircle className="w-4 h-4" />
                      {t('continueCourse')}
                    </Button>
                  ) : (
                    <Button onClick={() => handleEnroll(courseData.id)} disabled={loading} className="w-full gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                      {loading ? t('processing') : t('enrollFree')}
                    </Button>
                  )}
                  <p className="text-xs text-center text-muted-foreground">{t('free')} · {t('certificatePrice')}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />
              {t('community')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('communityDesc')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgriSchool;
