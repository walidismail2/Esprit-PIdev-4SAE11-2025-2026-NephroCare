package esprit.clinicalservice.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.clinicalservice.dtos.PreoperativeAssessmentDTO;
import esprit.clinicalservice.dtos.TransplantAiRecommendationDTO;
import esprit.clinicalservice.dtos.TransplantAiRecommendationEnvelopeDTO;
import esprit.clinicalservice.dtos.TransplantCandidacyDTO;
import jakarta.annotation.PostConstruct;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class TransplantAiRecommendationService {

    private static final String DISCLAIMER =
            "AI recommendation is decision support only. Final medical decision remains with the physician.";

    private final TransplantCandidacyService transplantCandidacyService;
    private final PreoperativeAssessmentService preoperativeAssessmentService;
    private final OpenAiChatClient chatClient;
    private final ObjectMapper objectMapper;

    @Value("${spring.ai.openai.api-key:}")
    private String openAiKey;

    public TransplantAiRecommendationService(
            TransplantCandidacyService transplantCandidacyService,
            PreoperativeAssessmentService preoperativeAssessmentService,
            ObjectProvider<OpenAiChatClient> chatClientProvider,
            ObjectMapper objectMapper
    ) {
        this.transplantCandidacyService = transplantCandidacyService;
        this.preoperativeAssessmentService = preoperativeAssessmentService;
        this.chatClient = chatClientProvider.getIfAvailable();
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        System.out.println(">>> OpenAI key loaded: " +
                (openAiKey != null && openAiKey.length() > 5 ? openAiKey.substring(0, 5) + "..." : "EMPTY"));
        System.out.println(">>> ChatClient available: " + (chatClient != null));
    }

    public TransplantAiRecommendationEnvelopeDTO generateRecommendation(Long candidacyId) {
        if (chatClient == null) {
            throw new IllegalStateException("Spring AI is not configured. Please set OPENAI_API_KEY first.");
        }

        TransplantCandidacyDTO candidacy = transplantCandidacyService.getCandidacyById(candidacyId);
        if (candidacy == null) {
            throw new RuntimeException("Transplant candidacy not found");
        }

        PreoperativeAssessmentDTO assessment =
                preoperativeAssessmentService.getAssessmentByPatientId(candidacy.getPatientId());

        String promptText = buildPrompt(candidacy, assessment);
        String responseText = chatClient.call(new Prompt(promptText)).getResult().getOutput().getContent();
        TransplantAiRecommendationDTO recommendation = parseAiResponse(responseText);
        recommendation.setDisclaimer(DISCLAIMER);

        TransplantAiRecommendationEnvelopeDTO envelope = new TransplantAiRecommendationEnvelopeDTO();
        envelope.setPatientId(candidacy.getPatientId());
        envelope.setCandidacyId(candidacyId);
        envelope.setGeneratedAt(OffsetDateTime.now().toString());
        envelope.setRecommendation(recommendation);
        return envelope;
    }

    private String buildPrompt(TransplantCandidacyDTO candidacy, PreoperativeAssessmentDTO assessment) {
        try {
            String candidacyJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(candidacy);
            String assessmentJson = assessment == null
                    ? "null"
                    : objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(assessment);

            return """
                    You are a kidney transplant clinical decision-support assistant.
                    Analyze the transplant candidacy and the most recent preoperative assessment.
                    This is medical decision support only, not a final diagnosis.

                    Return ONLY valid JSON with this exact shape:
                    {
                      "summary": "short clinical summary",
                      "riskLevel": "LOW|MEDIUM|HIGH",
                      "recommendation": "ELIGIBLE|PENDING|INELIGIBLE|REVIEW_NEEDED|ELIGIBLE_WITH_CAUTION",
                      "reasons": ["reason 1", "reason 2", "reason 3"]
                    }

                    Rules:
                    - Keep the summary under 60 words.
                    - reasons must contain 2 to 5 short strings.
                    - Consider immunological, infectious, cardiovascular, pulmonary, psychiatric, compliance, renal, and social factors.
                    - If data is missing, mention that in reasons and prefer PENDING or REVIEW_NEEDED.

                    Transplant candidacy:
                    %s

                    Latest preoperative assessment:
                    %s
                    """.formatted(candidacyJson, assessmentJson);
        } catch (Exception ex) {
            throw new RuntimeException("Unable to prepare transplant AI prompt", ex);
        }
    }

    private TransplantAiRecommendationDTO parseAiResponse(String responseText) {
        try {
            String json = extractJsonObject(responseText);
            TransplantAiRecommendationDTO dto = objectMapper.readValue(json, TransplantAiRecommendationDTO.class);

            if (dto.getSummary() == null || dto.getSummary().isBlank()) {
                dto.setSummary("No summary generated.");
            }
            if (dto.getRiskLevel() == null || dto.getRiskLevel().isBlank()) {
                dto.setRiskLevel("UNKNOWN");
            }
            if (dto.getRecommendation() == null || dto.getRecommendation().isBlank()) {
                dto.setRecommendation("REVIEW_NEEDED");
            }
            if (dto.getReasons() == null || dto.getReasons().isEmpty()) {
                dto.setReasons(List.of("AI response did not provide structured reasons."));
            }

            return dto;
        } catch (Exception ex) {
            TransplantAiRecommendationDTO fallback = new TransplantAiRecommendationDTO();
            fallback.setSummary("AI response could not be parsed into the expected structure.");
            fallback.setRiskLevel("UNKNOWN");
            fallback.setRecommendation("REVIEW_NEEDED");
            fallback.setReasons(List.of(
                    "The AI response was not valid JSON.",
                    "Review the transplant file manually.",
                    "Check the AI prompt or model configuration."
            ));
            return fallback;
        }
    }

    private String extractJsonObject(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }
}