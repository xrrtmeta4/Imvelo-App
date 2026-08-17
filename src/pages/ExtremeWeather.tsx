import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sun, CloudRain, Wind, Snowflake, Flame, Droplets, Sprout, Shield, CheckCircle2, Lock, PlayCircle, FileText, Award, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { openDodoCheckout } from '@/lib/dodoPayments';
import { jsPDF } from 'jspdf';

const COURSE_PRICE = 200;
const COURSE_CURRENCY = 'SZL';
const COURSE_PRODUCT_ID = 'pdt_0NYZaqcOARihEXXOPIdmC';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface CourseModule {
  title: string;
  content: string[];
}

interface Course {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: any;
  color: string;
  modules: CourseModule[];
  quiz: QuizQuestion[];
}

const COURSES: Course[] = [
  {
    id: 'drought',
    titleKey: 'droughtManagement',
    descriptionKey: 'droughtManagementDesc',
    icon: Sun,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    modules: [
      {
        title: 'Understanding Drought',
        content: [
          'Drought is a prolonged period of abnormally low rainfall that leads to water shortage.',
          'It affects soil moisture, crop yields, livestock health, and entire ecosystems.',
          'Early warning signs include: dropping water tables, cracked soil, wilting plants, and reduced stream flow.',
          'Climate change is increasing the frequency and severity of droughts in many regions.',
        ],
      },
      {
        title: 'Crop Protection Strategies',
        content: [
          'Select drought-tolerant crop varieties such as sorghum, millet, cassava, and cowpeas.',
          'Use mulching with straw or leaves to reduce soil evaporation by up to 50%.',
          'Implement drip irrigation or micro-sprinklers for efficient water use.',
          'Practice conservation agriculture: minimal tillage, crop residues, and crop rotation.',
          'Harvest and store rainwater in tanks or ponds during wet periods.',
        ],
      },
      {
        title: 'Livestock Management During Drought',
        content: [
          'Provide multiple water points to reduce competition and stress.',
          'Move animals to shaded grazing areas during the hottest parts of the day.',
          'Supplement feed with hay, protein blocks, and mineral licks.',
          'Monitor animals daily for dehydration: check skin elasticity and eye appearance.',
          'Reduce herd size if necessary to match available feed and water resources.',
        ],
      },
      {
        title: 'Water Management',
        content: [
          'Install rainwater harvesting systems on roofs and sheds.',
          'Use drip irrigation to deliver water directly to plant roots.',
          'Practice deficit irrigation: apply less water but at critical growth stages.',
          'Monitor soil moisture with simple tools or sensors.',
          'Reuse household water (after biodegradable soap) for garden irrigation.',
        ],
      },
    ],
    quiz: [
      {
        question: 'Which of the following is a drought-tolerant crop?',
        options: ['Rice', 'Sorghum', 'Lettuce', 'Celery'],
        correctIndex: 1,
      },
      {
        question: 'What is the best irrigation method for drought conditions?',
        options: ['Flood irrigation', 'Drip irrigation', 'Sprinkler irrigation', 'No irrigation'],
        correctIndex: 1,
      },
      {
        question: 'How can mulching help during drought?',
        options: ['It increases evaporation', 'It reduces soil moisture', 'It reduces soil evaporation', 'It attracts pests'],
        correctIndex: 2,
      },
      {
        question: 'What should you monitor in livestock during drought?',
        options: ['Only weight', 'Signs of dehydration', 'Only milk production', 'Only breeding'],
        correctIndex: 1,
      },
      {
        question: 'Which water source is most reliable during drought?',
        options: ['Rainwater only', 'Stored rainwater and groundwater', 'River water only', 'No water needed'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'flooding',
    titleKey: 'floodingManagement',
    descriptionKey: 'floodingManagementDesc',
    icon: CloudRain,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    modules: [
      {
        title: 'Understanding Flooding',
        content: [
          'Flooding occurs when water covers land that is usually dry.',
          'It can be caused by heavy rain, river overflow, dam failure, or coastal storms.',
          'Floods can destroy crops, erode soil, contaminate water, and spread diseases.',
          'Flash floods can develop within minutes, giving little warning time.',
        ],
      },
      {
        title: 'Crop Protection Strategies',
        content: [
          'Raise seed beds before heavy rains to keep roots above water.',
          'Plant flood-tolerant varieties such as rice, taro, and some maize varieties.',
          'Improve field drainage with ditches, channels, or raised beds.',
          'Avoid planting in low-lying areas prone to waterlogging.',
          'Apply fungicides preventively after floods to prevent fungal diseases.',
          'Use raised containers for sensitive vegetables and seedlings.',
        ],
      },
      {
        title: 'Livestock Management During Floods',
        content: [
          'Move animals to higher ground before floods arrive.',
          'Store feed in waterproof, elevated containers.',
          'Disinfect shelters and equipment after floodwaters recede.',
          'Vaccinate animals against waterborne diseases such as leptospirosis.',
          'Provide dry bedding in temporary shelters.',
          'Check all water sources for contamination before use.',
        ],
      },
      {
        title: 'Post-Flood Recovery',
        content: [
          'Assess damage to crops, soil, and infrastructure.',
          'Remove debris and silt from fields to prevent soil crusting.',
          'Test soil fertility and apply appropriate fertilizers.',
          'Practice crop rotation with fast-maturing varieties.',
          'Document losses for insurance claims if available.',
        ],
      },
    ],
    quiz: [
      {
        question: 'Which crop is flood-tolerant?',
        options: ['Wheat', 'Rice', 'Barley', 'Soybean'],
        correctIndex: 1,
      },
      {
        question: 'What should you do with livestock before floods?',
        options: ['Leave them in the field', 'Move them to higher ground', 'Tie them to trees', 'Feed them more'],
        correctIndex: 1,
      },
      {
        question: 'Why is drainage important in flood-prone areas?',
        options: ['It attracts water', 'It removes excess water', 'It has no effect', 'It increases flooding'],
        correctIndex: 1,
      },
      {
        question: 'What should you do after floodwaters recede?',
        options: ['Plant immediately', 'Disinfect shelters and check for contamination', 'Ignore the damage', 'Sell all animals'],
        correctIndex: 1,
      },
      {
        question: 'Which disease is common after floods?',
        options: ['Malaria', 'Leptospirosis', 'Diabetes', 'Asthma'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'heatwave',
    titleKey: 'heatwaveManagement',
    descriptionKey: 'heatwaveManagementDesc',
    icon: Flame,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    modules: [
      {
        title: 'Understanding Heatwaves',
        content: [
          'A heatwave is a prolonged period of unusually hot weather, often with high humidity.',
          'Heatwaves can cause heat stress in crops and livestock, leading to reduced yields and deaths.',
          'They are becoming more common due to climate change.',
          'Vulnerable groups include young animals, pregnant livestock, and shallow-rooted crops.',
        ],
      },
      {
        title: 'Crop Protection Strategies',
        content: [
          'Water early morning or late evening to reduce evaporation loss.',
          'Use shade nets to protect sensitive crops from direct sunlight.',
          'Increase irrigation frequency but reduce quantity per application.',
          'Avoid pruning or transplanting during extreme heat.',
          'Apply kaolin clay sprays to reflect sunlight and reduce leaf temperature.',
          'Harvest ripe produce earlier than usual to prevent sunburn and spoilage.',
        ],
      },
      {
        title: 'Livestock Management During Heatwaves',
        content: [
          'Ensure constant access to cool, clean water.',
          'Provide artificial shade in holding pens and grazing areas.',
          'Feed animals during cooler parts of the day (early morning, evening).',
          'Watch for heat stress signs: panting, lethargy, drooling, and reduced feed intake.',
          'Sprinkle water on animals if necessary to cool them down.',
          'Reduce stocking density temporarily to lower heat buildup.',
        ],
      },
      {
        title: 'Heat Stress Prevention',
        content: [
          'Install fans in animal housing to improve air circulation.',
          'Provide salt licks to help animals maintain hydration.',
          'Use light-colored buildings or reflective paints to reduce heat absorption.',
          'Plan breeding seasons to avoid peak heat periods.',
          'Have an emergency plan for extreme heat events.',
        ],
      },
    ],
    quiz: [
      {
        question: 'When is the best time to water crops during a heatwave?',
        options: ['Midday', 'Early morning or late evening', 'At midnight', 'Never'],
        correctIndex: 1,
      },
      {
        question: 'What is a sign of heat stress in livestock?',
        options: ['Increased appetite', 'Panting and lethargy', 'Normal behavior', 'Weight gain'],
        correctIndex: 1,
      },
      {
        question: 'How can shade nets help during heatwaves?',
        options: ['They increase temperature', 'They protect crops from direct sunlight', 'They attract pests', 'They reduce water'],
        correctIndex: 1,
      },
      {
        question: 'What should you do with animal stocking density during heatwaves?',
        options: ['Increase it', 'Reduce it temporarily', 'Keep it the same', 'It does not matter'],
        correctIndex: 1,
      },
      {
        question: 'Which spray can reflect sunlight from crops?',
        options: ['Pesticide', 'Kaolin clay spray', 'Fungicide', 'Herbicide'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'coldSpell',
    titleKey: 'coldSpellManagement',
    descriptionKey: 'coldSpellManagementDesc',
    icon: Snowflake,
    color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
    modules: [
      {
        title: 'Understanding Cold Spells',
        content: [
          'Cold spells and frost occur when temperatures drop significantly below normal.',
          'Frost can kill young seedlings, damage flowers, and reduce fruit set.',
          'Cold stress in livestock can lead to pneumonia, hypothermia, and reduced productivity.',
          'Climate variability is making cold spells more unpredictable.',
        ],
      },
      {
        title: 'Crop Protection Strategies',
        content: [
          'Cover seedlings with cloth, plastic, or frost cloth at night.',
          'Use frost-tolerant varieties in seasons prone to cold spells.',
          'Water crops before expected frost; moist soil retains heat better than dry soil.',
          'Use smoke generators or heaters in orchards to raise temperature.',
          'Avoid late-season nitrogen applications that promote tender growth.',
          'Mulch roots of perennial crops with straw or leaves.',
        ],
      },
      {
        title: 'Livestock Management During Cold Spells',
        content: [
          'Provide warm, dry shelter with adequate bedding (straw, sawdust).',
          'Increase energy-rich feed during cold periods to help animals maintain body heat.',
          'Protect young animals with blankets or covers.',
          'Ensure water does not freeze; use heated drinkers if necessary.',
          'Reduce wind exposure with windbreaks around pens.',
          'Monitor for hypothermia and pneumonia, especially in young and old animals.',
        ],
      },
      {
        title: 'Recovery After Cold Spells',
        content: [
          'Assess crop damage: prune affected parts, apply balanced fertilizer.',
          'Replant damaged seedlings if necessary.',
          'Check livestock for respiratory infections and treat early.',
          'Improve shelter insulation for future cold events.',
        ],
      },
    ],
    quiz: [
      {
        question: 'How can you protect seedlings from frost?',
        options: ['Leave them exposed', 'Cover them with cloth or plastic at night', 'Water them more', 'Move them to shade'],
        correctIndex: 1,
      },
      {
        question: 'Why is mulching roots helpful during cold spells?',
        options: ['It freezes the roots', 'It insulates the roots', 'It attracts pests', 'It has no effect'],
        correctIndex: 1,
      },
      {
        question: 'What should you do with livestock water in cold spells?',
        options: ['Let it freeze', 'Ensure it does not freeze', 'Give them less water', 'Only give warm water'],
        correctIndex: 1,
      },
      {
        question: 'What should you monitor livestock for after cold spells?',
        options: ['Heat stress', 'Hypothermia and pneumonia', 'Only weight loss', 'Only appetite'],
        correctIndex: 1,
      },
      {
        question: 'Why should you water crops before expected frost?',
        options: ['It makes them wet', 'Moist soil retains heat better', 'It causes frost', 'It has no effect'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'strongWinds',
    titleKey: 'strongWindsManagement',
    descriptionKey: 'strongWindsManagementDesc',
    icon: Wind,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    modules: [
      {
        title: 'Understanding Strong Winds and Storms',
        content: [
          'Strong winds and storms can uproot crops, break branches, damage structures, and erode soil.',
          'They are often accompanied by heavy rain, hail, or lightning.',
          'Climate change is increasing the intensity and frequency of storms in many regions.',
          'Early preparation can significantly reduce damage and protect lives.',
        ],
      },
      {
        title: 'Crop Protection Strategies',
        content: [
          'Install windbreaks with trees, fences, or hedges around fields.',
          'Use stakes and supports for tall crops such as maize and sunflowers.',
          'Plant in sheltered areas away from open fields when possible.',
          'Harvest mature crops before storm season to reduce wind damage.',
          'Secure greenhouses, tunnels, and netting structures.',
          'Remove weak branches that could become projectiles in high winds.',
        ],
      },
      {
        title: 'Livestock Management During Storms',
        content: [
          'Secure animals in sturdy shelters before storms arrive.',
          'Reinforce fences and gates to prevent escape.',
          'Store feed in windproof, elevated locations.',
          'Keep emergency supplies on hand: food, water, medicine, and batteries.',
          'Avoid tying animals to trees or weak posts that could fall.',
          'Inspect shelters after storms for damage and repair immediately.',
        ],
      },
      {
        title: 'Post-Storm Recovery',
        content: [
          'Assess damage to crops, livestock, and infrastructure.',
          'Clear debris and fallen branches from fields.',
          'Prune damaged trees and plants to prevent disease entry.',
          'Document losses for insurance claims.',
          'Review and improve your storm preparedness plan.',
        ],
      },
    ],
    quiz: [
      {
        question: 'What is a windbreak?',
        options: ['A type of crop', 'A barrier that reduces wind speed', 'A watering method', 'A fertilizer'],
        correctIndex: 1,
      },
      {
        question: 'Where should you secure livestock before storms?',
        options: ['In open fields', 'In sturdy shelters', 'Under trees', 'Near rivers'],
        correctIndex: 1,
      },
      {
        question: 'What should you do with tall crops before storms?',
        options: ['Leave them alone', 'Support them with stakes', 'Cut them down', 'Water them more'],
        correctIndex: 1,
      },
      {
        question: 'Why should you remove weak branches before storms?',
        options: ['They attract pests', 'They could become projectiles', 'They reduce yield', 'They use water'],
        correctIndex: 1,
      },
      {
        question: 'What should you do after a storm?',
        options: ['Ignore the damage', 'Assess damage and repair', 'Sell everything', 'Wait for government help'],
        correctIndex: 1,
      },
    ],
  },
];

const ExtremeWeather = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [currentModule, setCurrentModule] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(`imvelo_weather_courses_${user.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        setEnrolledCourses(new Set(data.enrolled || []));
        setCompletedCourses(new Set(data.completed || []));
      }
    } catch {
      // ignore
    }
  }, [user]);

  const saveProgress = (enrolled: Set<string>, completed: Set<string>) => {
    if (!user) return;
    localStorage.setItem(`imvelo_weather_courses_${user.id}`, JSON.stringify({
      enrolled: Array.from(enrolled),
      completed: Array.from(completed),
    }));
  };

  const course = useMemo(() => COURSES.find(c => c.id === activeCourse), [activeCourse]);

  const handleEnroll = async (courseId: string) => {
    if (!user?.email) {
      toast.error('Please sign in to enroll in courses');
      return;
    }

    setLoading(true);
    try {
      const courseData = COURSES.find(c => c.id === courseId);
      if (!courseData) return;

      await openDodoCheckout({
        productId: COURSE_PRODUCT_ID,
        productName: `Extreme Weather Course: ${t(courseData.titleKey)}`,
        amount: COURSE_PRICE,
        currency: COURSE_CURRENCY,
        customerEmail: user.email,
        customerName: user.user_metadata?.full_name || 'Customer',
        successUrl: window.location.origin + '/extreme-weather?success=true',
        cancelUrl: window.location.origin + '/extreme-weather',
        metadata: {
          course_id: courseId,
          user_id: user.id,
          type: 'course_enrollment',
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

  const handleStartCourse = (courseId: string) => {
    setActiveCourse(courseId);
    setCurrentModule(0);
    setQuizStarted(false);
    setQuizAnswers([]);
    setQuizSubmitted(false);
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
      const newCompleted = new Set(completedCourses);
      newCompleted.add(course.id);
      setCompletedCourses(newCompleted);
      saveProgress(enrolledCourses, newCompleted);
      toast.success(`Congratulations! You passed with ${correctCount}/${course.quiz.length} correct answers.`);
    } else {
      toast.error(`You scored ${correctCount}/${course.quiz.length}. You need 70% to pass. Please review the course and try again.`);
    }
  };

  const generateCertificate = (courseId: string) => {
    const courseData = COURSES.find(c => c.id === courseId);
    if (!courseData || !user) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

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
      doc.text('Course Fee: E200 SZL', pageWidth / 2, 143, { align: 'center' });

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

  if (activeCourse && course) {
    const isEnrolled = enrolledCourses.has(course.id);
    const isCompleted = completedCourses.has(course.id);

    if (!isEnrolled) {
      return (
        <div className="min-h-screen bg-background pb-20">
          <header className="bg-gradient-to-br from-sky-600 to-sky-700 text-white py-8 px-4">
            <div className="max-w-screen-sm mx-auto flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('extremeWeather')}</h1>
                <p className="text-sm text-white/80 mt-0.5">Learning Center</p>
              </div>
            </div>
          </header>
          <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className={`p-2 rounded-lg ${course.color}`}>
                    <course.icon className="w-5 h-5" />
                  </div>
                  {t(course.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t(course.descriptionKey)}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Course Fee</span>
                  <span className="font-semibold">E{COURSE_PRICE} {COURSE_CURRENCY}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-semibold">{course.modules.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quiz Questions</span>
                  <span className="font-semibold">{course.quiz.length}</span>
                </div>
                <Button onClick={() => handleEnroll(course.id)} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  {loading ? 'Processing...' : `Enroll for E${COURSE_PRICE}`}
                </Button>
                <Button variant="ghost" onClick={() => setActiveCourse(null)} className="w-full">
                  Back to Courses
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (!quizStarted) {
      return (
        <div className="min-h-screen bg-background pb-20">
          <header className="bg-gradient-to-br from-sky-600 to-sky-700 text-white py-8 px-4">
            <div className="max-w-screen-sm mx-auto flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t(course.titleKey)}</h1>
                <p className="text-sm text-white/80 mt-0.5">Course Content</p>
              </div>
            </div>
          </header>
          <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
            {course.modules.map((module, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-5 h-5 text-primary" />
                    Module {idx + 1}: {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {module.content.map((paragraph, pIdx) => (
                    <p key={pIdx} className="text-sm text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
            <div className="flex gap-3">
              <Button onClick={() => setQuizStarted(true)} className="flex-1 gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Take Quiz ({course.quiz.length} questions)
              </Button>
              <Button variant="ghost" onClick={() => setActiveCourse(null)} className="flex-1">
                Back to Courses
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!quizSubmitted) {
      return (
        <div className="min-h-screen bg-background pb-20">
          <header className="bg-gradient-to-br from-sky-600 to-sky-700 text-white py-8 px-4">
            <div className="max-w-screen-sm mx-auto flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Quiz</h1>
                <p className="text-sm text-white/80 mt-0.5">{t(course.titleKey)}</p>
              </div>
            </div>
          </header>
          <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
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
              Submit Quiz
            </Button>
          </div>
        </div>
      );
    }

    const correctCount = course.quiz.reduce((count, q, i) => count + (quizAnswers[i] === q.correctIndex ? 1 : 0), 0);
    const passed = correctCount >= course.quiz.length * 0.7;

    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-sky-600 to-sky-700 text-white py-8 px-4">
          <div className="max-w-screen-sm mx-auto flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quiz Results</h1>
              <p className="text-sm text-white/80 mt-0.5">{t(course.titleKey)}</p>
            </div>
          </div>
        </header>
        <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {passed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                {passed ? 'Congratulations!' : 'Keep Learning'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You scored {correctCount} out of {course.quiz.length} ({Math.round((correctCount / course.quiz.length) * 100)}%).
                {passed ? ' You passed the quiz!' : ' You need 70% to pass. Review the course and try again.'}
              </p>
              {passed && (
                <Button onClick={() => generateCertificate(course.id)} className="w-full gap-2">
                  <Award className="w-4 h-4" />
                  Download Certificate
                </Button>
              )}
              <div className="flex gap-3">
                {!passed && (
                  <Button onClick={() => { setQuizStarted(false); setQuizSubmitted(false); setQuizAnswers([]); }} className="flex-1">
                    Retake Quiz
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setActiveCourse(null)} className="flex-1">
                  Back to Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-sky-600 to-sky-700 text-white py-8 px-4">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('extremeWeather')}</h1>
            <p className="text-sm text-white/80 mt-0.5">Learning Center</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card className="bg-sky-50/50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-sky-600" />
              {t('whyThisMatters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('extremeWeatherDesc')}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Certified Courses</h2>
          {COURSES.map((courseData) => {
            const Icon = courseData.icon;
            const isEnrolled = enrolledCourses.has(courseData.id);
            const isCompleted = completedCourses.has(courseData.id);

            return (
              <Card key={courseData.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className={`p-2 rounded-lg ${courseData.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {t(courseData.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t(courseData.descriptionKey)}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Course Fee</span>
                    <span className="font-semibold">E{COURSE_PRICE} {COURSE_CURRENCY}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Modules</span>
                    <span className="font-semibold">{courseData.modules.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Quiz Questions</span>
                    <span className="font-semibold">{courseData.quiz.length}</span>
                  </div>
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </div>
                  ) : isEnrolled ? (
                    <Button onClick={() => handleStartCourse(courseData.id)} className="w-full gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Continue Course
                    </Button>
                  ) : (
                    <Button onClick={() => handleEnroll(courseData.id)} disabled={loading} className="w-full gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      {loading ? 'Processing...' : `Enroll for E${COURSE_PRICE}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExtremeWeather;
