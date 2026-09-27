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
	"ADMN:58,ADS:3,AE:19,AGEI:2,AHVS:196,ANTH:134,ART:66,ARTS:3,ASE:5,ASL:6,ASTR:22,ATWP:8,BEM:11,BIOC:12,BIOL:101,BME:39,BUS:21,CD:20,CE:2,CH:2,CHEM:74,CIVE:104,CNPY:23,COM:65,CS:6,CSC:162,CSPT:6,CW:8,CYC:67,DR:4,DSST:1,ECE:154,ECON:106,ECS:16,ED:105,EDCI:131,EDUC:2,ENGR:14,ENSH:151,ENT:13,EOS:65,EPHE:114,ER:24,ES:78,EUS:10,FA:13,FORB:7,FRAN:80,GDS:8,GEOG:92,GMST:73,GNDR:59,GREE:14,GRS:80,GS:7,HINF:64,HLST:3,HLTH:23,HS:3,HSTR:287,HUMA:15,IB:7,ICDG:11,IED:78,IGOV:20,IN:3,INDW:3,INEC:1,INGH:5,INTD:5,INTS:2,IS:28,ISP:5,ITAL:17,LAS:26,LATI:14,LAW:118,LING:108,MATH:94,MBA:34,MDIA:10,MECH:98,MEDI:30,MEDS:6,MGB:20,MICR:12,MLSC:20,MM:15,MRNE:18,MUS:179,NRSC:13,NUED:4,NUHI:2,NUNP:10,NURA:4,NURS:55,PAAS:138,PADR:2,PHIL:92,PHSP:15,PHYS:83,PLAN:17,POLI:118,PORT:2,PSYC:146,RCS:50,SCIE:5,SDH:13,SENG:29,SJS:5,SLLC:5,SLST:55,SMGT:7,SOCI:73,SOCW:59,SOSC:5,SPAN:50,STAT:47,TCA:11,THEA:129,TS:6,VIRS:9,VKUR:1,WRIT:76";

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
