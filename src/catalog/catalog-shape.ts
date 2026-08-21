/*
  A snapshot of the catalog's shape: every subject and how many courses it
  holds, in the alphabetical order the generated autocomplete file uses.

  The landing page draws one cell per course in the catalog. The real codes
  live in public/generated/course-autocomplete.json (~370KB), which only
  loads after first paint, so the wall needs the counts up front to render
  server-side without touching D1 on every visit.

  Regenerate after a catalog import (`nub run catalog:autocomplete`):

    node -e "const c=require('./public/generated/course-autocomplete.json');
    const m=new Map();for(const x of c){const s=x.subjectCode.match(/^[A-Z]+/)[0];
    m.set(s,(m.get(s)??0)+1)};console.log([...m].map(([s,n])=>s+':'+n).join(','))"

  src/catalog/catalog-shape.test.ts fails when this drifts from the catalog.
*/
const CATALOG_SHAPE =
	"ADMN:25,AE:19,AGEI:2,AHVS:164,ANTH:101,ART:52,ARTS:3,ASL:6,ASTR:13,ATWP:7,BEM:11,BIOC:9,BIOL:74,BME:22,CE:2,CHEM:46,CIVE:58,CNPY:5,COM:65,CS:6,CSC:82,CW:8,CYC:45,DSST:1,ECE:75,ECON:71,ECS:5,ED:48,EDCI:81,EDUC:2,ENGR:14,ENSH:132,ENT:13,EOS:46,EPHE:86,ER:24,ES:56,EUS:10,FA:12,FRAN:65,GDS:8,GEOG:75,GMST:45,GNDR:59,GREE:14,GRS:57,HINF:27,HLTH:23,HS:3,HSTR:221,HUMA:12,IB:7,ICDG:11,IED:63,IGOV:3,INGH:2,INTS:2,IS:28,ISP:5,ITAL:17,LAS:26,LATI:14,LAW:111,LING:77,MATH:66,MDIA:8,MECH:61,MEDI:30,MEDS:6,MICR:9,MLSC:12,MRNE:16,MUS:129,NURS:24,PAAS:130,PHIL:76,PHYS:53,POLI:83,PORT:2,PSYC:72,RCS:50,SCIE:4,SENG:29,SJS:5,SLLC:5,SLST:39,SMGT:7,SOCI:57,SOCW:34,SOSC:4,SPAN:50,STAT:29,TCA:11,THEA:104,TS:6,VIRS:9,VKUR:1,WRIT:64";

export type CatalogSubject = {
	subject: string;
	courseCount: number;
};

export const CATALOG_SUBJECTS: ReadonlyArray<CatalogSubject> =
	CATALOG_SHAPE.split(",").map((entry) => {
		const [subject, count] = entry.split(":");
		return { subject, courseCount: Number(count) };
	});

export const CATALOG_COURSE_COUNT = CATALOG_SUBJECTS.reduce(
	(total, { courseCount }) => total + courseCount,
	0,
);

/*
  One cell per course, carrying only the subject it belongs to — all the wall
  can say about a course before the real codes load. Built once here rather
  than per render, since every server response draws it.
*/
export const CATALOG_SKELETON: ReadonlyArray<{ id: string; subject: string }> =
	CATALOG_SUBJECTS.flatMap(({ subject, courseCount }) =>
		Array.from({ length: courseCount }, (_, position) => ({
			id: `${subject}${position}`,
			subject,
		})),
	);
